import { useState, useEffect } from 'react';
import { getCurrentUser, type UserInfo } from '../services/auth';

export interface Permissions {
  canManageDatasources: boolean;
  canUploadDocuments: boolean;
  canManagePRD: boolean;
  canManageDesigns: boolean;
  canExtractUIRequirements: boolean;
  canSearch: boolean;
  canDiffAnalysis: boolean;
  canReviewContent: boolean;
  canViewSearchHistory: boolean;
  canManagePermissions: boolean;
}

export function usePermissions(): {
  user: UserInfo | null;
  permissions: Permissions;
  loading: boolean;
} {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userInfo = await getCurrentUser();
        setUser(userInfo);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const roles = user?.roles || [];

  const permissions: Permissions = {
    canManageDatasources: roles.includes('admin'),
    canUploadDocuments: roles.includes('admin') || roles.includes('product') || roles.includes('ui'),
    canManagePRD: roles.includes('admin') || roles.includes('product'),
    canManageDesigns: roles.includes('admin') || roles.includes('ui'),
    canExtractUIRequirements: roles.includes('admin') || roles.includes('ui'),
    canSearch: true, // 所有角色都可以检索
    canDiffAnalysis: roles.includes('admin') || roles.includes('developer'),
    canReviewContent: roles.includes('admin'),
    canViewSearchHistory: roles.includes('admin') || roles.includes('developer'),
    canManagePermissions: roles.includes('admin'),
  };

  return { user, permissions, loading };
}

