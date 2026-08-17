/**
 * useAgvSelection Hook - Manages AGV selection state
 */

import { useState } from 'react';

export function useAgvSelection(defaultAgvId: string) {
  const [selectedId, setSelectedId] = useState(defaultAgvId);
  const [detailAgvId, setDetailAgvId] = useState<string | null>(null);
  const [approvalAgvId, setApprovalAgvId] = useState<string | null>(null);

  const selectAgv = (id: string) => {
    setSelectedId(id);
    setDetailAgvId(id);
  };

  const openAgvDetails = (id: string) => {
    setSelectedId(id);
    setDetailAgvId(id);
  };

  const closeAgvDetails = () => {
    setDetailAgvId(null);
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
    approvalAgvId,
    selectAgv,
    openAgvDetails,
    closeAgvDetails,
    openApprovalDetails,
    closeApprovalDetails
  };
}
