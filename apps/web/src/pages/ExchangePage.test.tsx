import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangePage } from './ExchangePage';

const auth = vi.hoisted(() => ({ exchangeTenantCode: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }));

describe('ExchangePage configuration handoff', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('opens tenant configuration only after the tenant session has been established', async () => {
    let complete!: () => void;
    auth.exchangeTenantCode.mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
    render(<MemoryRouter initialEntries={['/auth/exchange?code=one-use&customize=1']}>
      <Routes>
        <Route path="/auth/exchange" element={<ExchangePage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/settings" element={<div>Tenant configuration</div>} />
      </Routes>
    </MemoryRouter>);
    expect(screen.queryByText('Tenant configuration')).not.toBeInTheDocument();
    complete();
    expect(await screen.findByText('Tenant configuration')).toBeInTheDocument();
  });
});
