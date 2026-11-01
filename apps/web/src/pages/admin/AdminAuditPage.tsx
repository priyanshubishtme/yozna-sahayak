/**
 * Admin Audit Trail View
 */

import React from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { AuditRecord } from '../../types';

export const AdminAuditPage: React.FC = () => {
  const { t } = useLanguage();

  const auditEvents: AuditRecord[] = [
    {
      id: 'aud-001',
      actor: 'system_initializer',
      action: 'source_seed_registry',
      resource_type: 'source',
      resource_id: 'SRC-MYSCHEME-DIR',
      details: { automation_status: 'disabled_pending_written_authorization', policy: 'Section 3.3' },
      created_at: '2026-10-31 09:00:00 IST'
    },
    {
      id: 'aud-002',
      actor: 'system_initializer',
      action: 'seed_catalogue_initialization',
      resource_type: 'scheme',
      resource_id: '13_seed_records',
      details: { central_schemes: 9, state_schemes: 4 },
      created_at: '2026-10-31 09:08:20 IST'
    },
    {
      id: 'aud-003',
      actor: 'admin_reviewer',
      action: 'verify_governing_guidelines',
      resource_type: 'document_version',
      resource_id: 'doc-pmkisan-v1',
      details: { decision: 'approved', sha256_verified: true },
      created_at: '2026-10-31 09:12:00 IST'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {t('admin.nav.audit')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Immutable log of administrative reviews, approvals, source updates, and ingestion events.
        </p>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                <th style={{ padding: '0.75rem 1rem' }}>Target Resource</th>
                <th style={{ padding: '0.75rem 1rem' }}>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{e.created_at}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{e.actor}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge badge-muted">{e.action}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-primary)' }}>
                    {e.resource_type}:{e.resource_id}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {JSON.stringify(e.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
