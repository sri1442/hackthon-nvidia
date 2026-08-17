/**
 * Toast Component - Notification messages
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div className="toast">
      <CheckCircle2 size={16} />
      {message}
    </div>
  );
};
