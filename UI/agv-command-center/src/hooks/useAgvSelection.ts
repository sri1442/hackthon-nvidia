/**
 * useAgvSelection Hook - Manages AGV selection state
 */

import { useState } from 'react';

export function useAgvSelection(defaultAgvId: string) {
  const [selectedId, setSelectedId] = useState(defaultAgvId);
  const [detailAgvId, setDetailAgvId] = useState<string | null>(null);
  const [approvalAgvId, setApprovalAgvId] = useState<string | null>(null);
  const [detailAgvTab, setDetailAgvTab] = useState<'health' | 'battery' | 'nav' | 'drive' | 'mech' | 'safety' | 'alerts' | null>('health');

  const selectAgv = (id: string) => {
    setSelectedId(id);
    setDetailAgvId(id);
    setDetailAgvTab('health');
  };

  const openAgvDetails = (id: string, tab: typeof detailAgvTab = 'health') => {
    setSelectedId(id);
    setDetailAgvId(id);
    setDetailAgvTab(tab);
  };

  const closeAgvDetails = () => {
    setDetailAgvId(null);
    setDetailAgvTab(null);
  };

  const openApprovalDetails = (id: string) => {
    setSelectedId(id);
    setApprovalAgvId(id);
  };

  const closeApprovalDetails = () => {
    setApprovalAgvId(null);
  };

  return {
    selectedId,
    detailAgvId,
    detailAgvTab,
    approvalAgvId,
    selectAgv,
    openAgvDetails,
    closeAgvDetails,
    openApprovalDetails,
    closeApprovalDetails
  };
}
