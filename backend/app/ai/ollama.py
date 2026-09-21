import logging
from typing import Tuple, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    async def check_health(self) -> Tuple[bool, str]:
        """
        Check if Ollama service is reachable and list models.
        """
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    model_found = any(self.model in m or m in self.model for m in models)
                    if not model_found and models:
                        return True, f"Ollama доступен. Модели на сервере: {', '.join(models)}. Выбранная модель: {self.model}"
                    return True, f"Ollama доступен и готов к работе (модель: {self.model})."
                return False, f"Ollama ответил со статусом {res.status_code}."
        except httpx.ConnectError:
            return False, f"Не удалось подключиться к Ollama по адресу {self.base_url}. Убедитесь, что служба запущена."
        except Exception as e:
            return False, f"Ошибка проверки доступности Ollama: {str(e)}"

    async def generate_completion(self, system_prompt: str, user_prompt: str) -> Tuple[bool, str]:
        """
        Sends generation request to Ollama using format="json".
        Returns: (success: bool, raw_response_or_error: str)
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    result = response.json()
                    response_text = result.get("response", "")
                    if not response_text:
                        return False, "Ollama вернул пустой ответ."
                    return True, response_text
                elif response.status_code == 404:
                    return False, f"Модель '{self.model}' не найдена в Ollama. Запустите: ollama run {self.model}"
                else:
                    return False, f"Ollama вернул ошибку {response.status_code}: {response.text}"
        except httpx.ConnectError:
            return False, (
                f"Локальный AI сейчас недоступен. Проверьте, запущен ли Ollama ({self.base_url}). "
                "Вы всё равно можете создать вопросы вручную."
            )
        except httpx.ReadTimeout:
            return False, f"Превышено время ожидания ответа от модели {self.model} ({self.timeout} сек)."
        except Exception as e:
            logger.error(f"Error communicating with Ollama: {e}", exc_info=True)
            return False, f"Не удалось связаться с Ollama: {str(e)}"

ollama_service = OllamaService()
