import random
import string
from sqlalchemy.orm import Session
from app.models.test import Test

# Exclude confusing characters: 0, O, 1, I, L
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

def generate_room_code(db: Session, length: int = 6) -> str:
    """
    Generates a unique random alphanumeric room code.
    """
    for _ in range(100):
        code = "".join(random.choices(ALPHABET, k=length))
        existing = db.query(Test).filter(Test.room_code == code).first()
        if not existing:
            return code
    # Fallback to timestamp-based suffix if collisions occur
    import time
    return "".join(random.choices(ALPHABET, k=4)) + str(int(time.time()))[-2:]
