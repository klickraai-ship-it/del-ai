import sanitizeHtml from 'sanitize-html';
const emailAllowedTags = [
    'a', 'abbr', 'address', 'b', 'blockquote', 'br', 'caption', 'center', 'code',
    'col', 'colgroup', 'dd', 'div', 'dl', 'dt', 'em', 'font', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'q', 's', 'small',
    'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
    'thead', 'tr', 'u', 'ul',
];
const emailAllowedAttributes = {
    '*': ['class', 'id', 'style'],
    'a': ['href', 'name', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'border', 'style'],
    'table': ['width', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'align', 'style'],
    'td': ['width', 'height', 'align', 'valign', 'bgcolor', 'style', 'colspan', 'rowspan'],
    'th': ['width', 'height', 'align', 'valign', 'bgcolor', 'style', 'colspan', 'rowspan'],
    'tr': ['bgcolor', 'style'],
    'div': ['align', 'style'],
    'p': ['align', 'style'],
    'span': ['style'],
    'font': ['color', 'face', 'size', 'style'],
    'h1': ['style', 'align'],
    'h2': ['style', 'align'],
    'h3': ['style', 'align'],
    'h4': ['style', 'align'],
    'h5': ['style', 'align'],
    'h6': ['style', 'align'],
};
const emailAllowedStyles = {
    '*': {
        'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i, /^[a-z]+$/i],
        'background': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i, /^[a-z]+$/i],
        'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i, /^[a-z]+$/i],
        'text-align': [/^left$/i, /^right$/i, /^center$/i, /^justify$/i],
        'font-size': [/^\d+(?:px|em|%|pt|rem)$/i],
        'font-family': [/^[\w\s,'-]+$/i],
        'font-weight': [/^(?:normal|bold|\d{3})$/i],
        'line-height': [/^\d+(?:px|em|%)?$/i],
        'margin': [/^\d+(?:px|em|%)?(?:\s\d+(?:px|em|%)?){0,3}$/i],
        'margin-top': [/^\d+(?:px|em|%)?$/i],
        'margin-bottom': [/^\d+(?:px|em|%)?$/i],
        'margin-left': [/^\d+(?:px|em|%)?$/i],
        'margin-right': [/^\d+(?:px|em|%)?$/i],
        'padding': [/^\d+(?:px|em|%)?(?:\s\d+(?:px|em|%)?){0,3}$/i],
        'padding-top': [/^\d+(?:px|em|%)?$/i],
        'padding-bottom': [/^\d+(?:px|em|%)?$/i],
        'padding-left': [/^\d+(?:px|em|%)?$/i],
        'padding-right': [/^\d+(?:px|em|%)?$/i],
        'border': [/^[\d\s\w#]+$/i],
        'border-width': [/^\d+(?:px)?$/i],
        'border-style': [/^(?:none|solid|dashed|dotted|double)$/i],
        'border-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/i, /^rgba\(/i],
        'border-radius': [/^\d+(?:px|em|%)?$/i],
        'width': [/^\d+(?:px|em|%)?$/i],
        'height': [/^\d+(?:px|em|%)?$/i],
        'max-width': [/^\d+(?:px|em|%)?$/i],
        'max-height': [/^\d+(?:px|em|%)?$/i],
        'display': [/^(?:block|inline|inline-block|none|table|table-cell|flex)$/i],
        'vertical-align': [/^(?:top|middle|bottom|baseline)$/i],
    }
};
export function sanitizeEmailHtml(html, options = {}) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    const sanitized = sanitizeHtml(html, {
        allowedTags: options.allowedTags || emailAllowedTags,
        allowedAttributes: options.allowedAttributes || emailAllowedAttributes,
        allowedStyles: options.allowedStyles || emailAllowedStyles,
        allowProtocolRelative: options.allowProtocolRelative !== undefined ? options.allowProtocolRelative : true,
        transformTags: options.transformTags || {},
        disallowedTagsMode: 'discard',
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'],
        },
        allowedIframeHostnames: [],
    });
    return sanitized.trim();
}
export function sanitizeEmailText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .trim();
}
export function sanitizeSubject(subject) {
    if (!subject || typeof subject !== 'string') {
        return '';
    }
    return subject
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 998);
}
