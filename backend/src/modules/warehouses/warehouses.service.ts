import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Warehouse, WarehouseDocument, WarehouseSchema } from '../../schemas/warehouse.schema';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable({ scope: Scope.REQUEST })
export class WarehousesService {
  private warehouseModel: Model<WarehouseDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.warehouseModel = conn.modelNames().includes(Warehouse.name) ? conn.model<any>(Warehouse.name) as any : conn.model<any>(Warehouse.name, WarehouseSchema) as any;
  }

  async create(companyId: string, dto: CreateWarehouseDto) {
    return this.warehouseModel.create({ ...dto, companyId });
  }

  async findAll(companyId: string) {
    return this.warehouseModel.find({ companyId, isActive: true }).sort({ name: 1 }).lean();
  }

  async findOne(companyId: string, id: string) {
    const w = await this.warehouseModel.findOne({ _id: id, companyId }).lean();
    if (!w) throw new NotFoundException('Warehouse not found');
    return w;
  }

  async update(companyId: string, id: string, dto: UpdateWarehouseDto) {
    const w = await this.warehouseModel.findOneAndUpdate({ _id: id, companyId }, { $set: dto }, { new: true });
    if (!w) throw new NotFoundException('Warehouse not found');
    return w;
  }

  async remove(companyId: string, id: string) {
    const w = await this.warehouseModel.findOneAndUpdate({ _id: id, companyId }, { $set: { isActive: false } }, { new: true });
    if (!w) throw new NotFoundException('Warehouse not found');
    return { message: 'Warehouse deactivated' };
  }
}
