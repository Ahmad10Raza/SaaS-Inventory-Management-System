import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  costPrice: z.coerce.number().min(0).optional(),
  minSellingPrice: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  taxPercentage: z.coerce.number().min(0).max(100).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  dynamicAttributes: z.record(z.any()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => api.get('/products', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const selectedCategoryId = watch('categoryId');

  const { data: attributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['category-attributes', selectedCategoryId],
    queryFn: () => api.get(`/categories/${selectedCategoryId}/attributes`).then(r => r.data),
    enabled: !!selectedCategoryId,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => api.post('/products', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) => api.put(`/products/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); reset(); };

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    const fields = ['name', 'brand', 'description', 'categoryId', 'taxPercentage', 'minSellingPrice'];
    fields.forEach(key => setValue(key as any, item[key]));
    
    // For editing we assume the first variant is the default one for now
    if (item.variants?.[0]) {
      setValue('sku', item.variants[0].sku);
      setValue('barcode', item.variants[0].barcode);
      setValue('price', item.variants[0].price);
      setValue('costPrice', item.variants[0].costPrice);
      setValue('unit', item.variants[0].unit);
    }
    setShowModal(true);
  };

  const onSubmit = (data: ProductFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { key: 'name', label: 'Product', render: (item: any) => {
      const dv = item.variants?.[0];
      return (
        <div>
          <p className="font-medium">{item.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{dv?.sku || 'N/A'}</span>
            {item.brand && (
              <>
                <span>•</span>
                <span className="text-primary/70">{item.brand}</span>
              </>
            )}
          </div>
        </div>
      );
    }},
    { key: 'price', label: 'Price', render: (item: any) => {
      const dv = item.variants?.[0];
      return <span className="font-medium">₹{(dv?.price || item.minSellingPrice || 0).toLocaleString()}</span>;
    }},
    { key: 'costPrice', label: 'Cost', render: (item: any) => {
      const dv = item.variants?.[0];
      return <span className="text-muted-foreground">₹{(dv?.costPrice || 0).toLocaleString()}</span>;
    }},
    { key: 'totalStock', label: 'Total Stock', render: (item: any) => {
      const dv = item.variants?.[0];
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {item.totalStock || 0} {dv?.unit || 'pcs'}
        </span>
      );
    }},
    { key: 'availableStock', label: 'Available', render: (item: any) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        (item.availableStock || 0) <= 5
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      }`}>
        {item.availableStock || 0}
      </span>
    )},
    { key: 'taxPercentage', label: 'Tax %', render: (item: any) => `${item.taxPercentage || 0}%` },
  ];

  return (
    <>
      <DataTable
        title="Products"
        description="Manage your product catalog"
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={data?.page || 1}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        searchPlaceholder="Search products by name, SKU..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onPageChange={setPage}
        onAdd={() => { reset(); setShowModal(true); }}
        onEdit={handleEdit}
        onDelete={(item) => { if (confirm('Deactivate this product?')) deleteMutation.mutate(item._id); }}
        addLabel="Add Product"
        addPermission="product.create"
        editPermission="product.update"
        deletePermission="product.delete"
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input {...register('name')} placeholder="Product name" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input {...register('brand')} placeholder="e.g. Apple, Logitech" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input {...register('sku')} placeholder="SKU-1001" />
                  {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    {...register('categoryId')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {!categories || categories.length === 0 ? (
                      <option value="" disabled>No categories found - Seed error?</option>
                    ) : (
                      <>
                        <option value="">Select Category</option>
                        {categories.map((c: any) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                  {!categories && <p className="text-[10px] text-muted-foreground animate-pulse">Fetching categories...</p>}
                </div>
              </div>

              {/* Dynamic Attributes Section */}
              {selectedCategoryId && attributesLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin"/> Loading fields...</div>
              ) : attributes && attributes.length > 0 ? (
                <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">Category Attributes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {attributes.map((attr: any) => (
                      <div key={attr._id} className="space-y-2">
                        <Label>{attr.attributeName} {attr.required && '*'}</Label>
                        {attr.attributeType === 'dropdown' ? (
                          <select
                            {...register(`dynamicAttributes.${attr.attributeName}` as any)}
                            required={attr.required}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select {attr.attributeName}</option>
                            {attr.dropdownOptions.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : attr.attributeType === 'boolean' ? (
                           <label className="flex items-center gap-2 text-sm mt-2">
                             <input type="checkbox" {...register(`dynamicAttributes.${attr.attributeName}` as any)} />
                             Yes / Active
                           </label>
                        ) : (
                          <Input
                            type={attr.attributeType === 'number' ? 'number' : 'text'}
                            {...register(`dynamicAttributes.${attr.attributeName}` as any)}
                            required={attr.required}
                            placeholder={attr.defaultValue || ''}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Selling Price *</Label>
                  <Input type="number" step="0.01" {...register('price')} placeholder="0.00" />
                  {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input type="number" step="0.01" {...register('costPrice')} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Min Selling Price</Label>
                  <Input type="number" step="0.01" {...register('minSellingPrice')} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input {...register('unit')} placeholder="piece" />
                </div>
                <div className="space-y-2">
                  <Label>Tax %</Label>
                  <Input type="number" {...register('taxPercentage')} placeholder="18" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  {...register('description')}
                  placeholder="Product description..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
