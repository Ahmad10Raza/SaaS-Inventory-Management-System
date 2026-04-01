import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Star } from 'lucide-react';
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
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function VendorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', page, search],
    queryFn: () => api.get('/vendors', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => api.post('/vendors', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor created!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => api.put(`/vendors/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Updated!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor deactivated'); },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); reset(); };

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    ['name', 'email', 'phone', 'gstNumber', 'contactPerson', 'notes'].forEach(k => setValue(k as any, item[k] || ''));
    setShowModal(true);
  };

  const columns = [
    { key: 'name', label: 'Name', render: (i: any) => (
      <div><p className="font-medium">{i.name}</p>{i.contactPerson && <p className="text-xs text-muted-foreground">{i.contactPerson}</p>}</div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'rating', label: 'Rating', render: (i: any) => (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, idx) => (
          <Star key={idx} className={`w-3.5 h-3.5 ${idx < (i.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
        ))}
      </div>
    )},
    { key: 'totalOrders', label: 'Orders', render: (i: any) => i.totalOrders || 0 },
    { key: 'totalAmount', label: 'Total', render: (i: any) => `₹${(i.totalAmount || 0).toLocaleString()}` },
  ];

  return (
    <>
      <DataTable title="Vendors" description="Manage your vendors & suppliers" columns={columns}
        data={data?.data || []} total={data?.total || 0} page={data?.page || 1} totalPages={data?.totalPages || 1}
        isLoading={isLoading} searchPlaceholder="Search vendors..."
        onSearch={(q) => { setSearch(q); setPage(1); }} onPageChange={setPage}
        onAdd={() => { reset(); setShowModal(true); }} onEdit={handleEdit}
        onDelete={(i) => { if (confirm('Deactivate?')) deleteMut.mutate(i._id); }} addLabel="Add Vendor"
        addPermission="vendor.create"
        editPermission="vendor.update"
        deletePermission="vendor.delete"
        viewPermission="vendor.view"
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => editingId ? updateMut.mutate({ id: editingId, data: d }) : createMut.mutate(d))} className="p-6 space-y-4">
              <div className="space-y-2"><Label>Company Name *</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label>Contact Person</Label><Input {...register('contactPerson')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
              </div>
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
