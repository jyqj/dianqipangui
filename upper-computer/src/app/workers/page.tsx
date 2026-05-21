"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocketContext } from "../../lib/socketContext";
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  UserCircle,
  RefreshCw,
  X,
  Shield,
  User,
} from "lucide-react";

interface Worker {
  id: number;
  worker_no: string;
  name: string;
  role: string;
  phone?: string;
  created_at: string;
}

export default function WorkersPage() {
  const { emitWithAck } = useSocketContext();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetWorkerId, setResetWorkerId] = useState<number | null>(null);

  // 表单
  const [formData, setFormData] = useState({
    worker_no: "",
    name: "",
    password: "",
    role: "operator",
    phone: "",
  });
  const [newPassword, setNewPassword] = useState("");

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emitWithAck<Worker[]>("web:get_workers");
      setWorkers(data);
    } catch (err) {
      console.error("加载人员失败:", err);
    } finally {
      setLoading(false);
    }
  }, [emitWithAck]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const handleCreate = async () => {
    if (!formData.worker_no || !formData.name || !formData.password) {
      alert("请填写工号、姓名和密码");
      return;
    }
    const result = await emitWithAck<{ ok: boolean; msg?: string }>(
      "web:create_worker",
      formData
    );
    if (result.ok) {
      setIsFormOpen(false);
      setFormData({
        worker_no: "",
        name: "",
        password: "",
        role: "operator",
        phone: "",
      });
      loadWorkers();
    } else {
      alert(result.msg || "创建失败");
    }
  };

  const handleUpdate = async () => {
    if (!editWorker) return;
    await emitWithAck("web:update_worker", {
      id: editWorker.id,
      name: formData.name,
      role: formData.role,
      phone: formData.phone,
    });
    setEditWorker(null);
    setIsFormOpen(false);
    loadWorkers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该人员？")) return;
    const result = await emitWithAck<{ ok: boolean; msg?: string }>(
      "web:delete_worker",
      id
    );
    if (!result.ok) {
      alert(result.msg || "删除失败");
    }
    loadWorkers();
  };

  const handleResetPassword = async () => {
    if (!resetWorkerId || !newPassword) return;
    await emitWithAck("web:reset_password", {
      id: resetWorkerId,
      password: newPassword,
    });
    setIsResetOpen(false);
    setResetWorkerId(null);
    setNewPassword("");
    alert("密码已重置");
  };

  const openCreate = () => {
    setEditWorker(null);
    setFormData({
      worker_no: "",
      name: "",
      password: "",
      role: "operator",
      phone: "",
    });
    setIsFormOpen(true);
  };

  const openEdit = (worker: Worker) => {
    setEditWorker(worker);
    setFormData({
      worker_no: worker.worker_no,
      name: worker.name,
      password: "",
      role: worker.role,
      phone: worker.phone || "",
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">人员管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            管理系统操作人员账户
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadWorkers}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
          <button
            onClick={openCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加人员
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm table-striped">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-3">工号</th>
              <th className="text-left px-4 py-3">姓名</th>
              <th className="text-center px-4 py-3">角色</th>
              <th className="text-left px-4 py-3">电话</th>
              <th className="text-left px-4 py-3">创建时间</th>
              <th className="text-center px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  暂无人员数据
                </td>
              </tr>
            ) : (
              workers.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-blue-400">
                      {worker.worker_no}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{worker.name}</td>
                  <td className="px-4 py-3 text-center">
                    {worker.role === "admin" ? (
                      <span className="badge-yellow flex items-center gap-1 justify-center">
                        <Shield className="w-3 h-3" />
                        管理员
                      </span>
                    ) : (
                      <span className="badge-blue flex items-center gap-1 justify-center">
                        <User className="w-3 h-3" />
                        操作员
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {worker.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(worker.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(worker)}
                        className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setResetWorkerId(worker.id);
                          setNewPassword("");
                          setIsResetOpen(true);
                        }}
                        className="p-1.5 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                        title="重置密码"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      {worker.worker_no !== "admin" && (
                        <button
                          onClick={() => handleDelete(worker.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">
                {editWorker ? "编辑人员" : "添加人员"}
              </h3>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditWorker(null);
                }}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  工号 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.worker_no}
                  onChange={(e) =>
                    setFormData({ ...formData, worker_no: e.target.value })
                  }
                  placeholder="唯一工号"
                  disabled={!!editWorker}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  姓名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="真实姓名"
                />
              </div>
              {!editWorker && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    密码 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="登录密码"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  角色
                </label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="operator">操作员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  电话
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="联系电话"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={editWorker ? handleUpdate : handleCreate}
                  className="btn-primary flex-1"
                >
                  {editWorker ? "保存修改" : "创建"}
                </button>
                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditWorker(null);
                  }}
                  className="btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">
                重置密码
              </h3>
              <button
                onClick={() => setIsResetOpen(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  新密码 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  className="btn-warning flex-1"
                >
                  确认重置
                </button>
                <button
                  onClick={() => setIsResetOpen(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
