'use client';
import { useEffect, useRef } from 'react';
import { AlertTriangle, Archive, X } from 'lucide-react';
export default function ConfirmDialog({
  kind,
  onCancel,
  onConfirm,
  busy,
}: {
  kind: 'delete' | 'archive' | 'discard';
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    cancelRef.current?.focus();
    return () => el?.close();
  }, []);
  const text =
    kind === 'delete'
      ? [
          'Delete this note?',
          'This will permanently delete this note. This action cannot be undone.',
          'Delete note',
        ]
      : kind === 'archive'
        ? [
            'Archive this note?',
            'You can find it in Archived Notes and restore it whenever you need.',
            'Archive note',
          ]
        : [
            'Leave without saving?',
            'Your changes haven’t been saved yet. Keep editing or discard them to continue.',
            'Discard changes',
          ];
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div className="dialog-body">
        <span className="dialog-icon">
          {kind === 'archive' ? <Archive size={23} /> : <AlertTriangle size={23} />}
        </span>
        <div>
          <h2 id="dialog-title">{text[0]}</h2>
          <p id="dialog-description">{text[1]}</p>
        </div>
        <button
          className="icon-button dialog-close"
          aria-label="Close dialog"
          onClick={onCancel}
          disabled={busy}
        >
          <X size={19} />
        </button>
      </div>
      <div className="dialog-footer">
        <button ref={cancelRef} className="button secondary" onClick={onCancel} disabled={busy}>
          {kind === 'discard' ? 'Keep editing' : 'Cancel'}
        </button>
        <button
          className={`button ${kind === 'delete' ? 'danger' : 'primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : text[2]}
        </button>
      </div>
    </dialog>
  );
}
