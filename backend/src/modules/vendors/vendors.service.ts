import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Vendor, VendorDocument, VendorSchema } from '../../schemas/vendor.schema';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable({ scope: Scope.REQUEST })
export class VendorsService {
  private vendorModel: Model<VendorDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.vendorModel = conn.modelNames().includes(Vendor.name) ? conn.model<any>(Vendor.name) as any : conn.model<any>(Vendor.name, VendorSchema) as any;
  }

  async create(companyId: string, dto: CreateVendorDto) {
    return this.vendorModel.create({ ...dto, companyId });
  }

  async findAll(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { companyId, isActive: true };
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
    const v = await this.vendorModel.findOne({ _id: id, companyId }).lean();
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async update(companyId: string, id: string, dto: UpdateVendorDto) {
    const v = await this.vendorModel.findOneAndUpdate({ _id: id, companyId }, { $set: dto }, { new: true });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async remove(companyId: string, id: string) {
    const v = await this.vendorModel.findOneAndUpdate({ _id: id, companyId }, { $set: { isActive: false } }, { new: true });
    if (!v) throw new NotFoundException('Vendor not found');
    return { message: 'Vendor deactivated' };
  }
}
