'use client';

type ConfirmModalProps = {
    open: boolean;    
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
};

export function ConfirmModal({
    open,
    title,
    description,
    confirmText = "Delete",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    loading = false,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="aw-[420px] rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-black text-lg font-semibold text-gray-900-4 text-xl font-semibold">
                    {title}
                </h2>

                <p className="mt-2 text-sm text-gray-800">
                    {description}
                </p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="text-black rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
                    >
                        {cancelText}
                    </button>
                
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                            {loading ? "Deleting..." : confirmText}
                        </button>
                </div>
            </div>
        </div>
    );
}
