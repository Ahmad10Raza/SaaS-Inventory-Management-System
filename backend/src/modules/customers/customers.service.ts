import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection, Types } from 'mongoose';
import { Customer, CustomerDocument, CustomerSchema } from '../../schemas/customer.schema';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class CustomersService {
  private _customerModel: Model<CustomerDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get customerModel(): Model<CustomerDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._customerModel) {
      this._customerModel = (conn.modelNames().includes(Customer.name) ? conn.model(Customer.name) : conn.model(Customer.name, CustomerSchema)) as any;
    }
    return this._customerModel;
  }

  async create(companyId: string, dto: CreateCustomerDto) {
    return this.customerModel.create({ ...dto, companyId: ensureObjectId(companyId) });
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
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.customerModel.find(filter).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.customerModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const filter: any = { _id: id, isActive: true };
    if (companyId) {
      filter.companyId = typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;
    }
    const c = await this.customerModel.findOne(filter).lean();
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const c = await this.customerModel.findOneAndUpdate(filter, { $set: dto }, { new: true });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async remove(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const c = await this.customerModel.findOneAndUpdate(filter, { $set: { isActive: false } }, { new: true });
    if (!c) throw new NotFoundException('Customer not found');
    return { message: 'Customer deactivated' };
  }
}
