from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_role


router = APIRouter(prefix="/api/equipment", tags=["equipment"])


@router.get("/", response_model=List[schemas.EquipmentOut])
def list_equipment(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Equipment).all()


@router.post("/", response_model=schemas.EquipmentOut)
def create_equipment(
    payload: schemas.EquipmentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "operator")),
):
    if payload.client_id:
        existing = db.query(models.Equipment).filter(
            models.Equipment.client_id == payload.client_id
        ).first()
        if existing:
            return existing

    eq = models.Equipment(**payload.model_dump())
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq


@router.put("/{equipment_id}", response_model=schemas.EquipmentOut)
def update_equipment(
    equipment_id: int,
    payload: schemas.EquipmentUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "operator")),
):
    eq = db.query(models.Equipment).get(equipment_id)
    if not eq:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(eq, key, value)
    db.commit()
    db.refresh(eq)
    return eq


@router.delete("/{equipment_id}")
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin")),
):
    eq = db.query(models.Equipment).get(equipment_id)
    if not eq:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    db.delete(eq)
    db.commit()
    return {"ok": True}