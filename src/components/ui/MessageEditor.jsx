import { useRef, useState } from 'react';
import { FORM } from '../../config/zh-CN';
import { limitText, textLength } from '../../utils/textInput';
import '../../styles/MessageEditor.scss';

// Native inputs keep the IME candidate window, caret, selection and paste usable.
export default function MessageEditor({ activeField, setActiveField, values, setters, inputRefs }) {
    const composing = useRef({});
    // Keep the native input draft in this DOM root. A round trip through the
    // Three renderer during composition can replace the active IME range.
    const [draft, setDraft] = useState(values);
    const fields = [
        { id: 'email', limit: 254, label: FORM.email, placeholder: FORM.emailPlaceholder },
        { id: 'subject', limit: 50, label: FORM.subject, placeholder: FORM.subjectPlaceholder },
        { id: 'message', limit: 300, label: FORM.message, placeholder: FORM.messagePlaceholder },
    ];
    const update = (id, value, limit, isComposing) => {
        const nextValue = isComposing ? value : limitText(value, limit);
        setDraft(current => ({ ...current, [id]: nextValue }));
        if (!isComposing) setters[id](nextValue);
    };
    return (
        <section className="message-editor" hidden={!activeField} aria-label={FORM.edit} onPointerDown={e => e.stopPropagation()} onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape' && !e.nativeEvent.isComposing && !Object.values(composing.current).some(Boolean)) setActiveField(null);
        }}>
            <div className="message-editor__header">
                <strong>{FORM.edit}</strong>
                <button type="button" onClick={() => setActiveField(null)}>{FORM.done}</button>
            </div>
            <p id="message-preview-notice">{FORM.previewNotice}</p>
            {fields.map(({ id, label, limit, placeholder }) => {
                const Field = id === 'message' ? 'textarea' : 'input';
                return <label key={id}>
                    <span>{label}<small>{FORM.count(textLength(draft[id]), limit)}</small></span>
                    <Field
                        ref={inputRefs[id]} value={draft[id]} placeholder={placeholder}
                        type={id === 'email' ? 'email' : undefined} rows={id === 'message' ? 5 : undefined}
                        autoComplete={id === 'email' ? 'email' : 'off'} spellCheck={false}
                        aria-describedby="message-preview-notice"
                        onFocus={() => setActiveField(id)}
                        onCompositionStart={() => { composing.current[id] = true; }}
                        onCompositionEnd={e => {
                            composing.current[id] = false;
                            update(id, e.currentTarget.value, limit, false);
                        }}
                        onChange={e => update(id, e.currentTarget.value, limit, composing.current[id] || e.nativeEvent.isComposing)}
                    />
                </label>;
            })}
        </section>
    );
}
