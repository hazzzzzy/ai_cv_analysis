from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import List, TypedDict

from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, TypeAdapter, ValidationError

from app.api.v1.schemas.common import AnalysisResult, Question
from app.llm.client import build_chat_model
from app.llm.json_utils import JsonParseError, parse_json_strict


class Profile(BaseModel):
    industry: str
    role: str
    years_experience: str
    skills: List[str]
    project_types: List[str]
    weakness_hints: List[str]


class QuestionState(TypedDict):
    resume_text: str
    question_count: int
    profile_json: dict
    questions: List[Question]
    raw_output: str


class AnalysisState(TypedDict):
    resume_text: str
    questions: List[Question]
    answers: List[dict]
    final_analysis: AnalysisResult
    raw_output: str


class InterviewState(TypedDict):
    resume_text: str
    question_count: int
    expert_domains: List[str]
    profile_json: dict
    questions: List[Question]
    answers: List[dict]
    answers_input: List[str]
    current_index: int
    current_question: dict | None
    final_analysis: AnalysisResult | None


@dataclass
class LlmResult:
    value: object
    raw: str


class InterviewGraph:
    def __init__(self) -> None:
        self._chat = build_chat_model()
        self._questions_graph = self._build_questions_graph()
        self._analysis_graph = self._build_analysis_graph()

    def _load_prompt(self, name: str) -> str:
        path = Path(__file__).resolve().parent / 'prompts' / name
        return path.read_text(encoding='utf-8')

    def _invoke_json(self, prompt: str, adapter: TypeAdapter, max_retries: int) -> LlmResult:
        last_error: Exception | None = None
        for _ in range(max_retries + 1):
            response = self._chat.invoke([HumanMessage(content=prompt)])
            raw = response.content if hasattr(response, 'content') else str(response)
            try:
                data = parse_json_strict(raw)
                value = adapter.validate_python(data)
                return LlmResult(value=value, raw=raw)
            except (JsonParseError, ValidationError) as exc:
                last_error = exc
                continue
        raise ValueError(f'LLM 输出校验失败: {last_error}; raw={raw[:500]}') from last_error

    def _build_questions_graph(self):
        graph = StateGraph(QuestionState)

        def profile_infer(state: QuestionState) -> dict:
            template = self._load_prompt('profile.txt')
            prompt = template.format(resume_text=state['resume_text'])
            adapter = TypeAdapter(Profile)
            result = self._invoke_json(prompt, adapter, max_retries=2)
            return {'profile_json': result.value.model_dump(), 'raw_output': result.raw}

        def generate_questions(state: QuestionState) -> dict:
            template = self._load_prompt('questions.txt')
            prompt = template.format(
                resume_text=state['resume_text'],
                question_count=state['question_count'],
                profile_json=json.dumps(state.get('profile_json', {}), ensure_ascii=False),
            )
            adapter = TypeAdapter(List[Question])
            result = self._invoke_json(prompt, adapter, max_retries=2)
            return {'questions': result.value, 'raw_output': result.raw}

        graph.add_node('profile_infer', profile_infer)
        graph.add_node('generate_questions', generate_questions)
        graph.add_edge(START, 'profile_infer')
        graph.add_edge('profile_infer', 'generate_questions')
        graph.add_edge('generate_questions', END)
        return graph.compile()

    def _build_analysis_graph(self):
        graph = StateGraph(AnalysisState)

        def finalize_analysis(state: AnalysisState) -> dict:
            template = self._load_prompt('analysis.txt')
            prompt = template.format(
                resume_text=state['resume_text'],
                questions_json=json.dumps(
                    [q.model_dump() for q in state['questions']],
                    ensure_ascii=False,
                ),
                answers_json=json.dumps(state['answers'], ensure_ascii=False),
            )
            adapter = TypeAdapter(AnalysisResult)
            result = self._invoke_json(prompt, adapter, max_retries=2)
            return {'final_analysis': result.value, 'raw_output': result.raw}

        graph.add_node('finalize_analysis', finalize_analysis)
        graph.add_edge(START, 'finalize_analysis')
        graph.add_edge('finalize_analysis', END)
        return graph.compile()

    def _build_interview_graph(self):
        graph = StateGraph(InterviewState)

        def parse_resume(state: InterviewState) -> dict:
            return {'resume_text': state.get('resume_text', '')}

        def profile_infer(state: InterviewState) -> dict:
            template = self._load_prompt('profile.txt')
            prompt = template.format(resume_text=state['resume_text'])
            adapter = TypeAdapter(Profile)
            result = self._invoke_json(prompt, adapter, max_retries=2)
            return {'profile_json': result.value.model_dump()}

        def generate_questions(state: InterviewState) -> dict:
            template = self._load_prompt('questions.txt')
            prompt = template.format(
                resume_text=state['resume_text'],
                question_count=state['question_count'],
                profile_json=json.dumps(state.get('profile_json', {}), ensure_ascii=False),
            )
            adapter = TypeAdapter(List[Question])
            result = self._invoke_json(prompt, adapter, max_retries=2)
            return {'questions': result.value, 'current_index': 0}

        def next_question(state: InterviewState) -> dict:
            if not state.get('questions'):
                return {'current_question': None}
            return {'current_question': state['questions'][state['current_index']].model_dump()}

        def record_answer(state: InterviewState) -> dict:
            current = state.get('current_question')
            if not current:
                return {}
            answers = list(state.get('answers', []))
            answer_list = state.get('answers_input', [])
            answer_text = ''
            if state['current_index'] < len(answer_list):
                answer_text = answer_list[state['current_index']]
            answers.append({'question_id': current.get('id'), 'answer': answer_text})
            return {'answers': answers, 'current_index': state['current_index'] + 1}

        def finalize_analysis(state: InterviewState) -> dict:
            template = self._load_prompt('analysis.txt')
            prompt = template.format(
                resume_text=state['resume_text'],
                questions_json=json.dumps(
                    [q.model_dump() for q in state['questions']],
                    ensure_ascii=False,
                ),
                answers_json=json.dumps(state['answers'], ensure_ascii=False),
            )
            adapter = TypeAdapter(AnalysisResult)
            result = self._invoke_json(prompt, adapter, max_retries=2)
            return {'final_analysis': result.value}

        def should_continue(state: InterviewState) -> str:
            if state['current_index'] < state['question_count']:
                return 'next_question'
            return 'finalize_analysis'

        graph.add_node('parse_resume', parse_resume)
        graph.add_node('profile_infer', profile_infer)
        graph.add_node('generate_questions', generate_questions)
        graph.add_node('next_question', next_question)
        graph.add_node('record_answer', record_answer)
        graph.add_node('finalize_analysis', finalize_analysis)

        graph.add_edge(START, 'parse_resume')
        graph.add_edge('parse_resume', 'profile_infer')
        graph.add_edge('profile_infer', 'generate_questions')
        graph.add_edge('generate_questions', 'next_question')
        graph.add_edge('next_question', 'record_answer')
        graph.add_conditional_edges(
            'record_answer',
            should_continue,
            {
                'next_question': 'next_question',
                'finalize_analysis': 'finalize_analysis',
            },
        )
        graph.add_edge('finalize_analysis', END)
        return graph.compile()

    def generate_questions(self, resume_text: str, question_count: int) -> tuple[List[Question], str]:
        result = self._questions_graph.invoke(
            {
                'resume_text': resume_text,
                'question_count': question_count,
                'profile_json': {},
                'questions': [],
                'raw_output': '',
            }
        )
        return result['questions'], result['raw_output']

    def finalize_analysis(
        self,
        resume_text: str,
        questions: List[Question],
        answers: List[dict],
    ) -> tuple[AnalysisResult, str]:
        result = self._analysis_graph.invoke(
            {
                'resume_text': resume_text,
                'questions': questions,
                'answers': answers,
                'final_analysis': AnalysisResult(
                    pain_points=[],
                    optimization_suggestions=[],
                    improvement_directions=[],
                ),
                'raw_output': '',
            }
        )
        return result['final_analysis'], result['raw_output']

    def build_full_graph(self):
        return self._build_interview_graph()

    def run_full_interview(
        self,
        resume_text: str,
        question_count: int,
        answers_input: List[str],
    ) -> AnalysisResult:
        graph = self._build_interview_graph()
        result = graph.invoke(
            {
                'resume_text': resume_text,
                'question_count': question_count,
                'expert_domains': [],
                'profile_json': {},
                'questions': [],
                'answers': [],
                'answers_input': answers_input,
                'current_index': 0,
                'current_question': None,
                'final_analysis': None,
            }
        )
        return result['final_analysis']
