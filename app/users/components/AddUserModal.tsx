'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useRoles } from '@/hooks/useRoles';
import { handleApiError } from '@/lib/utils/errorHandler';
import toast from 'react-hot-toast';

const createUserSchema = z
  .object({
    name: z.string().min(1, 'Full name is required'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role_id: z.string().min(1, 'Please select a role'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type CreateUserForm = z.infer<typeof createUserSchema>;
type FormErrors = Partial<Record<keyof CreateUserForm, string>>;

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onCreateUser: (userData: {
    email: string;
    password: string;
    name: string;
    role_id: string;
  }) => Promise<unknown>;
}

const EMPTY_FORM: CreateUserForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role_id: '',
};

export function AddUserModal({
  open,
  onClose,
  onSuccess,
  onCreateUser,
}: AddUserModalProps) {
  const { roles, loading: rolesLoading } = useRoles();

  const [formData, setFormData] = useState<CreateUserForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const resetAndClose = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleSubmit = async () => {
    const result = createUserSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateUserForm;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    try {
      setSubmitting(true);
      await onCreateUser({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        role_id: result.data.role_id,
      });
      toast.success('User created successfully');
      resetAndClose();
      onSuccess();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `text-black w-full rounded-lg border px-3 py-2.5 focus:ring-2 outline-none transition-all ${
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h3 className="text-black mb-4 text-lg font-semibold">Add New User</h3>

        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 ml-1">Full Name</label>
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass(errors.name)}
            />
            {errors.name && (
              <p className="text-xs text-red-500 ml-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass(errors.email)}
            />
            {errors.email && (
              <p className="text-xs text-red-500 ml-1">{errors.email}</p>
            )}
          </div>

          {/* Password + Confirm Password */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`${inputClass(errors.password)} pr-10`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 ml-1">{errors.password}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className={`${inputClass(errors.confirmPassword)} pr-10`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 ml-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* User Role */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 ml-1">User Role</label>
            <div className="relative">
              <select
                value={formData.role_id}
                onChange={(e) =>
                  setFormData({ ...formData, role_id: e.target.value })
                }
                className={`${inputClass(errors.role_id)} appearance-none pr-10`}
                disabled={rolesLoading}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg
                  className="h-4 w-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {errors.role_id && (
              <p className="text-xs text-red-500 ml-1">{errors.role_id}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-opacity"
          >
            {submitting ? 'Creating...' : 'Create User'}
          </button>
          <button
            onClick={resetAndClose}
            disabled={submitting}
            className="text-black flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
