import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get('/customers', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => api.post('/customers', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer created!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => api.put(`/customers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Updated!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer deactivated'); },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); reset(); };

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    ['name', 'email', 'phone', 'gstNumber', 'notes'].forEach(k => setValue(k as any, item[k] || ''));
    setShowModal(true);
  };

  const onSubmit = (d: FormData) => editingId ? updateMut.mutate({ id: editingId, data: d }) : createMut.mutate(d);

  const columns = [
    { key: 'name', label: 'Name', render: (i: any) => <span className="font-medium">{i.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'totalPurchases', label: 'Purchases', render: (i: any) => `₹${(i.totalPurchases || 0).toLocaleString()}` },
    { key: 'outstandingAmount', label: 'Outstanding', render: (i: any) => (
      <span className={i.outstandingAmount > 0 ? 'text-red-500 font-medium' : 'text-green-500'}>
        ₹{(i.outstandingAmount || 0).toLocaleString()}
      </span>
    )},
  ];

  return (
    <>
      <DataTable title="Customers" description="Manage your customers" columns={columns}
        data={data?.data || []} total={data?.total || 0} page={data?.page || 1} totalPages={data?.totalPages || 1}
        isLoading={isLoading} searchPlaceholder="Search customers..."
        onSearch={(q) => { setSearch(q); setPage(1); }} onPageChange={setPage}
        onAdd={() => { reset(); setShowModal(true); }} onEdit={handleEdit}
        onDelete={(i) => { if (confirm('Deactivate?')) deleteMut.mutate(i._id); }} addLabel="Add Customer"
        addPermission="customer.create"
        editPermission="customer.update"
        deletePermission="customer.delete"
        viewPermission="customer.view"
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
              <div className="space-y-2"><Label>GST Number</Label><Input {...register('gstNumber')} /></div>
              <div className="space-y-2"><Label>Notes</Label><textarea {...register('notes')} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
