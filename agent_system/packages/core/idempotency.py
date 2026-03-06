from typing import Any, Callable, Dict
import functools
from sqlalchemy.ext.asyncio import AsyncSession
from models import IdempotencyKey

async def check_or_save_idempotency(db: AsyncSession, key: str, action: str, execute_fn: Callable) -> Dict[str, Any]:
    """
    Ensures that an action is only executed once for a given idempotency key.
    If the key exists, returns the cached result.
    Otherwise, executes the function and caches the result.
    """
    existing_record = await db.get(IdempotencyKey, key)
    
    if existing_record:
        print(f"[Idempotency] Cache hit for key: {key}")
        return existing_record.result_payload
        
    print(f"[Idempotency] Cache miss for key: {key}. Executing action: {action}")
    # Execute the actual logic
    result = await execute_fn()
    
    # Save the result
    new_record = IdempotencyKey(
        key=key,
        action=action,
        result_payload=result
    )
    db.add(new_record)
    await db.commit()
    
    return result
