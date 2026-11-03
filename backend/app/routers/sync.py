from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user


router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/push")
def push_changes(
    operations: List[schemas.SyncOperation],
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    results = []
    for op in operations:
        if op.entity == "equipment":
            if op.op_type == "create":
                existing = db.query(models.Equipment).filter(
                    models.Equipment.client_id == op.client_id
                ).first()
                if existing:
                    results.append({"client_id": op.client_id, "server_id": existing.id, "status": "duplicate"})
                    continue
                eq = models.Equipment(
                    client_id=op.client_id,
                    name=op.data.get("name"),
                    type=op.data.get("type"),
                    status=op.data.get("status", "В работе"),
                    description=op.data.get("description"),
                    x_coord=op.data.get("x_coord"),
                    y_coord=op.data.get("y_coord"),
                )
                db.add(eq)
                db.flush()
                results.append({"client_id": op.client_id, "server_id": eq.id, "status": "created"})

            elif op.op_type == "update":
                eq = db.query(models.Equipment).filter(
                    models.Equipment.client_id == op.client_id
                ).first()
                if eq:
                    for k, v in op.data.items():
                        if hasattr(eq, k):
                            setattr(eq, k, v)
                    results.append({"client_id": op.client_id, "server_id": eq.id, "status": "updated"})
                else:
                    results.append({"client_id": op.client_id, "status": "not_found"})

            elif op.op_type == "delete":
                eq = db.query(models.Equipment).filter(
                    models.Equipment.client_id == op.client_id
                ).first()
                if eq:
                    db.delete(eq)
                results.append({"client_id": op.client_id, "status": "deleted"})

    db.commit()

    all_equipment = db.query(models.Equipment).all()
    return {
        "processed": results,
        "server_time": datetime.utcnow(),
        "equipment": [
            {
                "id": e.id,
                "client_id": e.client_id,
                "name": e.name,
                "type": e.type,
                "status": e.status,
                "x_coord": e.x_coord,
                "y_coord": e.y_coord,
                "updated_at": e.updated_at.isoformat() if e.updated_at else None,
            }
            for e in all_equipment
        ],
    }


@router.get("/pull")
def pull_changes(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    equipment = db.query(models.Equipment).all()
    return {
        "equipment": [
            {
                "id": e.id,
                "client_id": e.client_id,
                "name": e.name,
                "type": e.type,
                "status": e.status,
                "description": e.description,
                "x_coord": e.x_coord,
                "y_coord": e.y_coord,
                "updated_at": e.updated_at.isoformat() if e.updated_at else None,
            }
            for e in equipment
        ]
    }