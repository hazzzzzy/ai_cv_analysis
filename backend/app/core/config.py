from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    app_name: str = 'resume-interview'
    app_env: str = 'local'
    app_host: str = '0.0.0.0'
    app_port: int = 8000
    app_log_level: str = 'INFO'
    app_cors_origins: str = 'http://localhost:3000'

    mysql_host: str = '127.0.0.1'
    mysql_port: int = 3306
    mysql_db: str = 'resume_interview'
    mysql_user: str = 'root'
    mysql_password: str = ''

    database_url: str = ''

    deepseek_api_key: str = ''
    deepseek_base_url: str = ''
    deepseek_model: str = 'deepseek-chat'
    llm_timeout_seconds: int = 60
    llm_max_retries: int = 2

    resume_max_mb: int = 10
    resume_storage_mode: str = 'db_text'
    resume_local_dir: str = './.data/resumes'

    secret_key: str = ''
    request_id_header: str = 'X-Request-ID'

    @property
    def computed_database_url(self) -> str:
        if self.database_url:
            value = self.database_url
            value = value.replace('${MYSQL_USER}', self.mysql_user)
            value = value.replace('${MYSQL_PASSWORD}', self.mysql_password)
            value = value.replace('${MYSQL_HOST}', self.mysql_host)
            value = value.replace('${MYSQL_PORT}', str(self.mysql_port))
            value = value.replace('${MYSQL_DB}', self.mysql_db)
            if value != self.database_url:
                return value
            return self.database_url

        return (
            f'mysql+aiomysql://{self.mysql_user}:{self.mysql_password}'
            f'@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}?charset=utf8mb4'
        )


settings = Settings()
