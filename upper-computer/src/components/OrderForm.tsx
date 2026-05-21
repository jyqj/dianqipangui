"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Worker {
  id: number;
  name: string;
  worker_no: string;
}

interface OrderFormData {
  id?: number;
  title: string;
  target_x: string;
  target_y: string;
  target_node: string;
  assigned_worker_id: string;
}

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrderFormData) => void;
  workers: Worker[];
  editData?: {
    id: number;
    title: string;
    target_x?: number;
    target_y?: number;
    target_node?: string;
    assigned_worker_id?: number;
  } | null;
}

export default function OrderForm({
  isOpen,
  onClose,
  onSubmit,
  workers,
  editData,
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    title: "",
    target_x: "",
    target_y: "",
    target_node: "",
    assigned_worker_id: "",
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        id: editData.id,
        title: editData.title || "",
        target_x: editData.target_x != null ? String(editData.target_x) : "",
        target_y: editData.target_y != null ? String(editData.target_y) : "",
        target_node: editData.target_node || "",
        assigned_worker_id: editData.assigned_worker_id
          ? String(editData.assigned_worker_id)
          : "",
      });
    } else {
      setFormData({
        title: "",
        target_x: "",
        target_y: "",
        target_node: "",
        assigned_worker_id: "",
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-gray-100">
            {editData ? "编辑工单" : "新建工单"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              工单标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="请输入工单标题"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                目标 X
              </label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.target_x}
                onChange={(e) =>
                  setFormData({ ...formData, target_x: e.target.value })
                }
                placeholder="X 坐标"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                目标 Y
              </label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.target_y}
                onChange={(e) =>
                  setFormData({ ...formData, target_y: e.target.value })
                }
                placeholder="Y 坐标"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              目标节点
            </label>
            <input
              type="text"
              className="input"
              value={formData.target_node}
              onChange={(e) =>
                setFormData({ ...formData, target_node: e.target.value })
              }
              placeholder="例如: A1, B2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              操作员
            </label>
            <select
              className="input"
              value={formData.assigned_worker_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  assigned_worker_id: e.target.value,
                })
              }
            >
              <option value="">未指定</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} ({worker.worker_no})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editData ? "保存修改" : "创建工单"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
