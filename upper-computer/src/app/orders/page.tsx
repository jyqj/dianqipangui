"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocketContext } from "../../lib/socketContext";
import OrderTable from "../../components/OrderTable";
import OrderForm from "../../components/OrderForm";
import { Plus, Filter, RefreshCw } from "lucide-react";
import { OrderStatus, OrderStatusLabel } from "../../shared/enums";

interface Order {
  id: number;
  order_no: string;
  title: string;
  target_x?: number;
  target_y?: number;
  target_node?: string;
  assigned_worker_id?: number;
  worker_name?: string;
  status: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration_s?: number;
}

interface Worker {
  id: number;
  name: string;
  worker_no: string;
}

export default function OrdersPage() {
  const { emitWithAck, lastOrderUpdate } = useSocketContext();

  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, string> = {};
      if (filterStatus) filter.status = filterStatus;
      const data = await emitWithAck<Order[]>("web:get_orders", filter);
      setOrders(data);
    } catch (err) {
      console.error("加载工单失败:", err);
    } finally {
      setLoading(false);
    }
  }, [emitWithAck, filterStatus]);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await emitWithAck<Worker[]>("web:get_workers");
      setWorkers(data);
    } catch (err) {
      console.error("加载人员失败:", err);
    }
  }, [emitWithAck]);

  useEffect(() => {
    loadOrders();
    loadWorkers();
  }, [loadOrders, loadWorkers]);

  // 实时更新
  useEffect(() => {
    if (lastOrderUpdate) {
      loadOrders();
    }
  }, [lastOrderUpdate, loadOrders]);

  const handleStart = async (id: number) => {
    if (!confirm("确认启动该工单？")) return;
    await emitWithAck("web:start_order", id);
    loadOrders();
  };

  const handlePause = async (id: number) => {
    await emitWithAck("web:pause_order", id);
    loadOrders();
  };

  const handleResume = async (id: number) => {
    await emitWithAck("web:resume_order", id);
    loadOrders();
  };

  const handleCancel = async (id: number) => {
    if (!confirm("确认取消该工单？")) return;
    await emitWithAck("web:cancel_order", id);
    loadOrders();
  };

  const handleEdit = (order: Order) => {
    setEditData(order);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该工单？")) return;
    await emitWithAck("web:delete_order", id);
    loadOrders();
  };

  const handleFormSubmit = async (formData: {
    id?: number;
    title: string;
    target_x: string;
    target_y: string;
    target_node: string;
    assigned_worker_id: string;
  }) => {
    const payload = {
      ...(formData.id ? { id: formData.id } : {}),
      title: formData.title,
      target_x: formData.target_x ? parseFloat(formData.target_x) : undefined,
      target_y: formData.target_y ? parseFloat(formData.target_y) : undefined,
      target_node: formData.target_node || undefined,
      assigned_worker_id: formData.assigned_worker_id
        ? parseInt(formData.assigned_worker_id)
        : undefined,
    };

    if (formData.id) {
      await emitWithAck("web:update_order", payload);
    } else {
      await emitWithAck("web:create_order", payload);
    }

    setIsFormOpen(false);
    setEditData(null);
    loadOrders();
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">工单管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            管理吊装转运工单的创建、下发与追踪
          </p>
        </div>
        <button
          onClick={() => {
            setEditData(null);
            setIsFormOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建工单
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="card px-4 py-3 flex items-center gap-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className="input w-48"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          {Object.values(OrderStatus).map((status) => (
            <option key={status} value={status}>
              {OrderStatusLabel[status]}
            </option>
          ))}
        </select>
        <button
          onClick={loadOrders}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          刷新
        </button>
        <span className="text-xs text-gray-500 ml-auto">
          共 {orders.length} 条工单
        </span>
      </div>

      {/* 工单表格 */}
      <OrderTable
        orders={orders}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 工单表单弹窗 */}
      <OrderForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditData(null);
        }}
        onSubmit={handleFormSubmit}
        workers={workers}
        editData={editData}
      />
    </div>
  );
}
