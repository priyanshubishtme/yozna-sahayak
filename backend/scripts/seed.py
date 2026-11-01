"""Database seeding CLI script."""

import asyncio
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.seed import seed_database
from backend.app.core.logging import logger


async def main():
    logger.info("Starting database seeding...")
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    logger.info("Database seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
