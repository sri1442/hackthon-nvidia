/**
 * SectionTitle Component - Reusable section header
 */

import React from 'react';

interface SectionTitleProps {
    icon?: React.ReactNode;
    title: string;
    badge?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ icon, title, badge }) => {
    return (
        <div className="panel-title">
            <div className="title-left">
                {icon && <span>{icon}</span>}
                <h2>{title}</h2>
            </div>
            {badge && (
                <span className="panel-badge">
                    {badge}
                </span>
            )}
        </div>
    );
};
