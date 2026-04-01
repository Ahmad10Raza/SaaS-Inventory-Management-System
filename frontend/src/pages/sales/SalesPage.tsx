import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, FileText, Trash2, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/tooltip';
import api from '@/services/api';
import Can from '@/components/common/Can';

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showInvoiceId, setShowInvoiceId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ id: string, amount: number } | null>(null);
  const [payMethod, setPayMethod] = useState('cash');
  
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [items, setItems] = useState<any[]>([]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, search],
    queryFn: () => api.get('/sales', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => api.get('/customers', { params: { limit: 100 } }).then(r => r.data?.data || []),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => api.get('/warehouses').then(r => r.data || []),
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get('/products', { params: { limit: 100 } }).then(r => r.data?.data || []),
  });

  const { data: invoice } = useQuery({
    queryKey: ['invoice', showInvoiceId],
    queryFn: () => api.get(`/sales/invoice/${showInvoiceId}`).then(r => r.data),
    enabled: !!showInvoiceId,
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/sales', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Sale created and Invoice generated!');
      closeModal();
    },
    onError: (e: any) => {
      let msg = 'Failed to process request';
      if (e.response?.data?.message) {
        msg = Array.isArray(e.response.data.message) 
          ? e.response.data.message[0] 
          : e.response.data.message;
        
        // Clean up raw DTO strings for the client
        if (msg.includes('should not exist')) msg = 'Internal error: Unknown property sent.';
        if (msg.includes('quantity must not be less than')) msg = 'Quantity error: Cannot sell 0 units.';
        if (msg.includes('items.')) msg = msg.replace(/items\.\d+\./, 'Item ');
      }
      toast.error(msg);
    },
  });

  const paymentMut = useMutation({
    mutationFn: (d: { id: string, amount: number, paymentMethod: string }) => 
      api.post(`/sales/${d.id}/payment`, { amount: d.amount, paymentMethod: d.paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Payment recorded successfully!');
      setPaymentModal(null);
    },
    onError: () => toast.error('Failed to record payment'),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => api.put(`/sales/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Order status updated!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update status'),
  });

  const closeModal = () => {
    setShowModal(false);
    setCustomerId('');
    setWarehouseId('');
    setPaymentMethod('');
    setItems([]);
  };

  const handleAddItem = () => setItems([...items, { productId: '', productName: '', quantity: 1, unitPrice: 0, taxPercentage: 0, discount: 0 }]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'productId') {
      const p = products?.find((p: any) => p._id === value);
      if (p) {
        newItems[index] = { ...newItems[index], productId: p._id, productName: p.name, unitPrice: p.price, taxPercentage: p.taxPercentage || 0, maxStock: p.currentStock };
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error('Select a customer');
    if (!warehouseId) return toast.error('Select a warehouse to deduct stock from');
    if (items.length === 0) return toast.error('Add items');
    createMut.mutate({ 
      customerId, 
      warehouseId, 
      paymentMethod, 
      items: items.map(i => ({ 
        productId: i.productId,
        productName: i.productName,
        quantity: Number(i.quantity), 
        unitPrice: Number(i.unitPrice), 
        taxPercentage: Number(i.taxPercentage), 
        discount: Number(i.discount) 
      })) 
    });
  };

  const columns = [
    { key: 'saleNumber', label: 'Sale #', render: (i: any) => <span className="font-semibold text-primary">{i.saleNumber}</span> },
    { key: 'customerId', label: 'Customer', render: (i: any) => i.customerId?.name || '-' },
    { key: 'status', label: 'Status', render: (i: any) => <span className="capitalize">{i.status}</span> },
    { key: 'paymentStatus', label: 'Payment', render: (i: any) => (
      <Can permission="sales.pay">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (i.paymentStatus !== 'paid') setPaymentModal({ id: i._id, amount: i.totalAmount });
          }}
          disabled={i.paymentStatus === 'paid'}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold transition-opacity cursor-pointer disabled:cursor-default disabled:opacity-100 hover:opacity-80 ${
            i.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
            i.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}
        >
          {i.paymentStatus.toUpperCase()}
        </button>
      </Can>
    )},
    { key: 'totalAmount', label: 'Total', render: (i: any) => `₹${i.totalAmount?.toLocaleString()}` },
    { key: 'createdAt', label: 'Date', render: (i: any) => new Date(i.createdAt).toLocaleDateString() },
    { key: 'action', label: 'Invoice', render: (i: any) => (
      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={(e) => { e.stopPropagation(); setShowInvoiceId(i.invoiceId); }}>
        <FileText className="w-4 h-4 text-blue-600" />
      </Button>
    )},
  ];

  return (
    <>
      <DataTable
        title="Sales"
        description="Create sales, issue invoices, and track payments"
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={data?.page || 1}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        searchPlaceholder="Search sale number..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onPageChange={setPage}
        onAdd={() => setShowModal(true)}
        addLabel="New Sale"
        addPermission="sales.create"
        viewPermission="sales.view"
      />

      {/* Create Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in py-10">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-full flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Create New Sale</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="sale-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                      <option value="">Select Customer</option>
                      {customers?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Fulfill From Warehouse *
                      <InfoTooltip text="Selecting a warehouse dictates exactly where this physical stock will be deducted from your total system inventory." />
                    </Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                      <option value="">Select Warehouse</option>
                      {warehouses?.map((w: any) => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      <option value="">Pending / To be Paid</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Products *</Label>
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}><Plus className="w-4 h-4 mr-1"/> Add Item</Button>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Product</th>
                          <th className="px-3 py-2 text-left font-medium w-24">Qty</th>
                          <th className="px-3 py-2 text-left font-medium w-32">Unit Price</th>
                          <th className="px-3 py-2 text-left font-medium w-24">Discount</th>
                          <th className="px-3 py-2 text-left font-medium w-24">Tax %</th>
                          <th className="px-3 py-2 text-left font-medium w-32">Total</th>
                          <th className="px-3 py-2 text-center w-12 text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No items added</td></tr>
                        ) : items.map((item, index) => {
                          const discount = Number(item.discount || 0);
                          const subtotal = (item.quantity * item.unitPrice) - discount;
                          const tax = subtotal * (item.taxPercentage/100);
                          const itemTotal = subtotal + tax;
                          return (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">
                                <select className="flex h-8 w-full rounded border bg-background px-2 py-1 text-xs" value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} required>
                                  <option value="">Select Product...</option>
                                  {products?.map((p: any) => <option key={p._id} value={p._id}>{p.name} (Stock: {p.currentStock})</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" min="1" max={item.maxStock || undefined} className="h-8 text-xs px-2" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required />
                                {item.maxStock !== undefined && item.quantity > item.maxStock && <span className="text-[10px] text-red-500 block leading-tight">Max {item.maxStock}</span>}
                              </td>
                              <td className="px-3 py-2"><Input type="number" min="0" step="0.01" className="h-8 text-xs px-2" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} required /></td>
                              <td className="px-3 py-2"><Input type="number" min="0" className="h-8 text-xs px-2" value={item.discount} onChange={e => handleItemChange(index, 'discount', e.target.value)} /></td>
                              <td className="px-3 py-2"><Input type="number" min="0" className="h-8 text-xs px-2" value={item.taxPercentage} onChange={e => handleItemChange(index, 'taxPercentage', e.target.value)} /></td>
                              <td className="px-3 py-2 font-medium bg-muted/30">₹{itemTotal.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" onClick={() => handleRemoveItem(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4 mx-auto" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="sale-form" disabled={createMut.isPending || items.length === 0}>
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Sale
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {showInvoiceId && invoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white text-black rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2"><IndianRupee className="w-5 h-5"/> Invoice Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowInvoiceId(null)} className="h-8 w-8 p-0 rounded-full"><X className="w-4 h-4" /></Button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 font-sans">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">INVOICE</h1>
                  <p className="text-gray-500 mt-1 font-medium">{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {invoice.status}
                  </span>
                  <p className="text-gray-500 mt-2 text-sm font-medium">Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                  <p className="text-gray-500 text-sm font-medium">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-8 border-l-4 border-gray-900 pl-4 py-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Billed To:</p>
                <p className="font-bold text-lg text-gray-900">{invoice.customerId?.name}</p>
                {invoice.customerId?.email && <p className="text-gray-600 text-sm">{invoice.customerId.email}</p>}
                {invoice.customerId?.phone && <p className="text-gray-600 text-sm">{invoice.customerId.phone}</p>}
                {invoice.customerId?.gstNumber && <p className="text-gray-600 text-sm font-medium mt-1">GST: {invoice.customerId.gstNumber}</p>}
              </div>

              <table className="w-full text-sm mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-900 text-left text-gray-900">
                    <th className="py-3 font-bold uppercase tracking-wider text-xs">Description</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-center">Qty</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-right">Price</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-right">Tax</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((it: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-3 text-gray-800 font-medium">{it.description}</td>
                      <td className="py-3 text-center text-gray-600 font-medium">{it.quantity}</td>
                      <td className="py-3 text-right text-gray-600 font-medium">₹{it.unitPrice}</td>
                      <td className="py-3 text-right text-gray-500 text-xs">₹{it.taxAmount?.toFixed(2)} ({it.taxPercentage}%)</td>
                      <td className="py-3 text-right font-bold text-gray-900">₹{it.totalPrice?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pr-2">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span className="font-medium">Subtotal</span><span className="font-semibold">₹{invoice.subtotal?.toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-600"><span className="font-medium">Tax</span><span className="font-semibold">₹{invoice.taxDetails?.totalTax?.toLocaleString() || invoice.totalTax?.toLocaleString()}</span></div>
                  <div className="border-t border-gray-900 pt-2 flex justify-between text-lg mt-2">
                    <span className="font-black text-gray-900">Total</span>
                    <span className="font-black text-gray-900">₹{invoice.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-lg border-t text-center flex justify-between items-center">
              <p className="text-xs text-gray-500 font-medium tracking-wide">Thank you for your business!</p>
              <Button variant="outline" size="sm" className="bg-white border-gray-200 text-gray-800 hover:bg-gray-100 font-semibold" onClick={() => window.print()}>
                Print/PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card text-card-foreground border rounded-lg shadow-xl w-full max-w-sm flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Record Payment</h2>
              <button onClick={() => setPaymentModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Amount Due</Label>
                <Input disabled value={`₹${paymentModal.amount.toLocaleString()}`} className="font-bold text-lg" />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <Button 
                className="w-full mt-4" 
                onClick={() => paymentMut.mutate({ id: paymentModal.id, amount: paymentModal.amount, paymentMethod: payMethod })}
                disabled={paymentMut.isPending}
              >
                {paymentMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Status as Paid
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
