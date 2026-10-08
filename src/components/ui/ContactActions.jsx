import { useEffect, useRef, useState } from 'react';
import '../../styles/ContactActions.scss';

export default function ContactActions({ content }) {
    const [status, setStatus] = useState('');
    const [copying, setCopying] = useState(false);
    const mounted = useRef(true);
    const account = useRef();
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    const copy = async () => {
        setCopying(true);
        setStatus('');
        try {
            await navigator.clipboard.writeText(content.copyValue);
            if (mounted.current) setStatus('已复制。');
        } catch {
            if (!mounted.current) return;
            setStatus('复制未成功，请选中下面的账号手动复制。');
            account.current?.focus();
            if (account.current) {
                const range = document.createRange();
                range.selectNodeContents(account.current);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } finally {
            if (mounted.current) setCopying(false);
        }
    };
    const isMail = content.url?.startsWith('mailto:');
    return <div className="contact-actions">
        <p className="contact-actions__account" ref={account} tabIndex={0} aria-label={`${content.platformConfig.label}账号`}>{content.account}</p>
        {content.copyValue && <button type="button" className="studio-action-button" onClick={copy} disabled={copying}>{copying ? '正在复制…' : content.copyLabel}</button>}
        {content.url && <a className="studio-action-button" href={content.url} target={isMail ? undefined : '_blank'} rel={isMail ? undefined : 'noopener noreferrer'}>{content.actionLabel}{!isMail && ' ↗'}</a>}
        <p className="contact-actions__status" role="status" aria-live="polite">{status}</p>
    </div>;
}
