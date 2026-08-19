'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

const MIN_MPESA_WITHDRAW_KES = 100;
const CELOSCAN_TX_URL = 'https://celoscan.io/tx/';

type WalletModalKind = 'mpesa' | 'send' | null;

interface UsdtWalletModalsProps {
  open: WalletModalKind;
  onClose: () => void;
  availableBalance: number;
  onWithdrawMpesa?: (phone: string, amount: number) => void | Promise<void>;
  onSendUsdt?: (recipient: string, amount: number) => Promise<string | void>;
}

function WalletBottomSheet({
  open,
  onClose,
  variant,
  children,
}: {
  open: boolean;
  onClose: () => void;
  variant: 'mpesa' | 'send';
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-x-0 inset-y-0 z-[130] flex items-end justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            className={`wallet-bottom-sheet wallet-bottom-sheet--${variant} pointer-events-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wallet-bottom-sheet__accent" />
            <button
              type="button"
              onClick={onClose}
              className="wallet-bottom-sheet__close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="wallet-bottom-sheet__body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function WalletDestinationLogos() {
  return (
    <div className="wallet-logo-stack" aria-label="Send to Binance, Bybit, MetaMask and more">
      <div className="wallet-logo-stack__item">
        <Image src="/Binance-Icon-Logo.png" alt="Binance" width={32} height={32} className="wallet-logo-stack__img" />
      </div>
      <div className="wallet-logo-stack__item">
        <Image src="/bybit_logo.png" alt="Bybit" width={32} height={32} className="wallet-logo-stack__img" />
      </div>
      <div className="wallet-logo-stack__item">
        <Image src="/metamask_logo.png" alt="MetaMask" width={32} height={32} className="wallet-logo-stack__img" />
      </div>
      <div className="wallet-logo-stack__item wallet-logo-stack__item--more" aria-hidden>
        <span className="wallet-logo-stack__more-text">+1</span>
      </div>
    </div>
  );
}

function AmountLabelRow({
  label,
  icon,
  minHint,
}: {
  label: string;
  icon: string;
  minHint?: string;
}) {
  return (
    <span className="wallet-modal-field__label wallet-modal-field__label--row">
      <span className="wallet-modal-field__label-main">
        <span className="wallet-modal-field__label-icon" aria-hidden>{icon}</span>
        {label}
      </span>
      {minHint && <span className="wallet-modal-field__min-hint">{minHint}</span>}
    </span>
  );
}

function AvailableBalanceHint({ balance }: { balance: number }) {
  return (
    <p className="wallet-modal-balance-inline">
      Available: <strong>{balance.toFixed(2)} USDT</strong>
    </p>
  );
}

function MpesaWithdrawForm({
  balance,
  onClose,
  onSubmit,
}: {
  balance: number;
  onClose: () => void;
  onSubmit?: (phone: string, amount: number) => void | Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const canSubmit =
    phone.trim().length >= 9 &&
    parsedAmount >= MIN_MPESA_WITHDRAW_KES &&
    parsedAmount <= balance &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(phone.trim(), parsedAmount);
      } else {
        toast.info('Coming soon', {
          description: 'M-Pesa cash-out on Celo is on the way.',
        });
      }
      onClose();
    } catch {
      toast.error('Withdrawal failed', { description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="wallet-modal-hero">
        <Image
          src="/mpesa.webp"
          alt="M-Pesa"
          width={120}
          height={40}
          className="wallet-modal-mpesa-header__logo"
          priority
        />
        <h2 className="wallet-modal-hero__title">Cash out 💸</h2>
        <p className="wallet-modal-hero__subtitle">Turn your USDT into M-Pesa on Celo</p>
      </div>

      <div className="wallet-modal-form-card">
        <label className="wallet-modal-field">
          <span className="wallet-modal-field__label">
            <span className="wallet-modal-field__label-icon" aria-hidden>📱</span>
            M-Pesa number
          </span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="0712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="wallet-modal-field__input"
            autoComplete="tel"
          />
        </label>
        <label className="wallet-modal-field">
          <AmountLabelRow
            label="Amount (USDT)"
            icon="💵"
            minHint={`Min KES ${MIN_MPESA_WITHDRAW_KES}`}
          />
          <input
            type="number"
            inputMode="decimal"
            min={MIN_MPESA_WITHDRAW_KES}
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="wallet-modal-field__input"
          />
        </label>
        <AvailableBalanceHint balance={balance} />
        {parsedAmount > 0 && parsedAmount < MIN_MPESA_WITHDRAW_KES && (
          <p className="wallet-modal-error">Minimum withdrawal is KES {MIN_MPESA_WITHDRAW_KES}.</p>
        )}
        {parsedAmount > balance && (
          <p className="wallet-modal-error">That&apos;s more than you have — check your balance.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="wallet-modal-action-btn wallet-modal-action-btn--withdraw"
      >
        {submitting ? 'Processing…' : 'Withdraw to M-Pesa'}
      </button>
    </>
  );
}

function formatAddressShort(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function SendUsdtSuccess({
  amount,
  recipient,
  txHash,
  onDone,
}: {
  amount: number;
  recipient: string;
  txHash?: string;
  onDone: () => void;
}) {
  return (
    <div className="wallet-send-success">
      <div className="wallet-send-success__icon" aria-hidden>
        <Check size={32} strokeWidth={3} />
      </div>
      <h2 className="wallet-send-success__title">USDT sent!</h2>
      <p className="wallet-send-success__subtitle">
        <strong>{amount.toFixed(2)} USDT</strong> is on its way to{' '}
        <span className="font-mono">{formatAddressShort(recipient)}</span>
      </p>
      <div className="wallet-send-success__details">
        <div className="wallet-send-success__row">
          <span>Amount</span>
          <strong>{amount.toFixed(2)} USDT</strong>
        </div>
        <div className="wallet-send-success__row">
          <span>To</span>
          <strong className="font-mono text-xs">{formatAddressShort(recipient)}</strong>
        </div>
        <div className="wallet-send-success__row">
          <span>Network</span>
          <strong>Celo</strong>
        </div>
      </div>
      {txHash && (
        <a
          href={`${CELOSCAN_TX_URL}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-send-success__link"
        >
          View on Celoscan
          <ExternalLink size={14} />
        </a>
      )}
      <button type="button" onClick={onDone} className="wallet-modal-action-btn wallet-modal-action-btn--send">
        Done
      </button>
    </div>
  );
}

function SendUsdtForm({
  active,
  balance,
  onClose,
  onSubmit,
}: {
  active: boolean;
  balance: number;
  onClose: () => void;
  onSubmit?: (recipient: string, amount: number) => Promise<string | void>;
}) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    amount: number;
    recipient: string;
    txHash?: string;
  } | null>(null);

  useEffect(() => {
    if (!active) {
      setRecipient('');
      setAmount('');
      setSubmitting(false);
      setError(null);
      setSuccess(null);
    }
  }, [active]);

  const parsedAmount = parseFloat(amount) || 0;
  const recipientValid = /^0x[a-fA-F0-9]{40}$/.test(recipient.trim());
  const canSubmit = recipientValid && parsedAmount > 0 && parsedAmount <= balance && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (onSubmit) {
        const txHash = await onSubmit(recipient.trim(), parsedAmount);
        setSuccess({
          amount: parsedAmount,
          recipient: recipient.trim(),
          txHash: txHash || undefined,
        });
      } else {
        toast.info('Coming soon', {
          description: 'On-chain USDT transfers are on the way.',
        });
        onClose();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SendUsdtSuccess
        amount={success.amount}
        recipient={success.recipient}
        txHash={success.txHash}
        onDone={onClose}
      />
    );
  }

  return (
    <>
      <div className="wallet-modal-hero">
        <span className="wallet-modal-hero__emoji" aria-hidden>🚀</span>
        <h2 className="wallet-modal-hero__title">Send USDT</h2>
        <p className="wallet-modal-hero__subtitle">Ship tokens to any wallet on Celo</p>
      </div>

      <WalletDestinationLogos />

      <div className={`wallet-modal-form-card${submitting ? ' wallet-modal-form-card--busy' : ''}`}>
        <label className="wallet-modal-field">
          <span className="wallet-modal-field__label">
            <span className="wallet-modal-field__label-icon" aria-hidden>👛</span>
            Recipient address
          </span>
          <input
            type="text"
            inputMode="text"
            placeholder="0x…"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="wallet-modal-field__input font-mono text-sm"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            disabled={submitting}
          />
        </label>
        {recipient.trim().length > 0 && !recipientValid && (
          <p className="wallet-modal-error">Paste a valid Celo address (0x + 40 hex chars).</p>
        )}
        <label className="wallet-modal-field">
          <AmountLabelRow label="Amount (USDT)" icon="💵" />
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="wallet-modal-field__input"
            disabled={submitting}
          />
        </label>
        <AvailableBalanceHint balance={balance} />
        {parsedAmount > balance && (
          <p className="wallet-modal-error">That&apos;s more than you have — check your balance.</p>
        )}
        {error && <p className="wallet-modal-error">{error}</p>}
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="wallet-modal-action-btn wallet-modal-action-btn--send"
      >
        {submitting ? (
          <span className="wallet-modal-action-btn__loading">
            <span className="wallet-modal-action-btn__spinner" aria-hidden />
            Sending on Celo…
          </span>
        ) : (
          'Send USDT'
        )}
      </button>
    </>
  );
}

export function UsdtWalletModals({
  open,
  onClose,
  availableBalance,
  onWithdrawMpesa,
  onSendUsdt,
}: UsdtWalletModalsProps) {
  const balance = useMemo(
    () => (Number.isFinite(availableBalance) ? availableBalance : 0),
    [availableBalance],
  );

  return (
    <>
      <WalletBottomSheet open={open === 'mpesa'} onClose={onClose} variant="mpesa">
        <MpesaWithdrawForm
          balance={balance}
          onClose={onClose}
          onSubmit={onWithdrawMpesa}
        />
      </WalletBottomSheet>
      <WalletBottomSheet open={open === 'send'} onClose={onClose} variant="send">
        <SendUsdtForm
          active={open === 'send'}
          balance={balance}
          onClose={onClose}
          onSubmit={onSendUsdt}
        />
      </WalletBottomSheet>
    </>
  );
}

export type { WalletModalKind };
