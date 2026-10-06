import os
import tempfile

# Must be set before agentforge is imported.
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["AGENTFORGE_INLINE_WORKER"] = "0"
os.environ["AGENTFORGE_SEED_DEMO"] = "0"
os.environ["AGENTFORGE_RUNTIME"] = "local"

import pytest  # noqa: E402

from agentforge import seed  # noqa: E402
from agentforge.models import SessionLocal, init_db  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _db():
    init_db()
    with SessionLocal() as s:
        seed.seed_core(s)
        seed.seed_workers(s)
    yield


@pytest.fixture()
def session():
    with SessionLocal() as s:
        yield s
