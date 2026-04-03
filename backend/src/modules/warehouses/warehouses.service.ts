import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection, Types } from 'mongoose';
import { Warehouse, WarehouseDocument, WarehouseSchema } from '../../schemas/warehouse.schema';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class WarehousesService {
  private _warehouseModel: Model<WarehouseDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get warehouseModel(): Model<WarehouseDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._warehouseModel) {
      this._warehouseModel = (conn.modelNames().includes(Warehouse.name) ? conn.model(Warehouse.name) : conn.model(Warehouse.name, WarehouseSchema)) as any;
    }
    return this._warehouseModel;
  }

  async create(companyId: string, dto: CreateWarehouseDto) {
    return this.warehouseModel.create({ ...dto, companyId: ensureObjectId(companyId) });
  }

  async findAll(companyId: string) {
    const filter: any = { isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    return this.warehouseModel.find(filter).sort({ name: 1 }).lean();
  }

  async findOne(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id), isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const w = await this.warehouseModel.findOne(filter).lean();
    if (!w) throw new NotFoundException('Warehouse not found');
    return w;
  }

  async update(companyId: string, id: string, dto: UpdateWarehouseDto) {
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const w = await this.warehouseModel.findOneAndUpdate(filter, { $set: dto }, { new: true });
    if (!w) throw new NotFoundException('Warehouse not found');
    return w;
  }

  async remove(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const w = await this.warehouseModel.findOneAndUpdate(filter, { $set: { isActive: false } }, { new: true });
    if (!w) throw new NotFoundException('Warehouse not found');
    return { message: 'Warehouse deactivated' };
  }
}
