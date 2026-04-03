import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection, Types } from 'mongoose';
import { Vendor, VendorDocument, VendorSchema } from '../../schemas/vendor.schema';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class VendorsService {
  private _vendorModel: Model<VendorDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get vendorModel(): Model<VendorDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._vendorModel) {
      this._vendorModel = (conn.modelNames().includes(Vendor.name) ? conn.model(Vendor.name) : conn.model(Vendor.name, VendorSchema)) as any;
    }
    return this._vendorModel;
  }

  async create(companyId: string, dto: CreateVendorDto) {
    return this.vendorModel.create({ ...dto, companyId: ensureObjectId(companyId) });
  }

  async findAll(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.vendorModel.find(filter).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.vendorModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id), isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const v = await this.vendorModel.findOne(filter).lean();
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async update(companyId: string, id: string, dto: UpdateVendorDto) {
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const v = await this.vendorModel.findOneAndUpdate(filter, { $set: dto }, { new: true });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async remove(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const v = await this.vendorModel.findOneAndUpdate(filter, { $set: { isActive: false } }, { new: true });
    if (!v) throw new NotFoundException('Vendor not found');
    return { message: 'Vendor deactivated' };
  }
}
