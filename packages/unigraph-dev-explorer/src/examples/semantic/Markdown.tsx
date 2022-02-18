import { Typography } from '@mui/material';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import TurndownService from 'turndown';
import rehypeRaw from 'rehype-raw';
import { DynamicViewRenderer } from '../../global.d';
import remarkWikilink from './wikilink';
import { getCaret } from '../../utils';

export function htmlToMarkdown(html: string) {
    TurndownService.prototype.escape = (input: string) => input;
    const turndown = new (TurndownService as any)({
        preformattedCode: true,
    });
    return turndown.turndown(html);
}

const getTextNodes = (root: any) => {
    const children: any[] = [];
    root.children.forEach((el: any) => {
        if (el.children) children.push(...getTextNodes(el));
        else if (el.type === 'text') children.push({ position: root.position, ...el });
    });
    return children;
};

const compFactory = (name: string, { node, inline, className, children, ...props }: any) =>
    // eslint-disable-next-line react/no-children-prop
    React.createElement(name, {
        className,
        children,
        contentEditable: true,
        suppressContentEditableWarning: true,
        onPointerUp: (event: PointerEvent) => {
            const currentText = (window.getSelection() as any).anchorNode?.textContent;
            const currentNode = getTextNodes(node).filter((el: any) => el.value === currentText)[0];
            const currentPos = currentNode?.position?.start?.offset || 0;
            if (!(event.target as HTMLElement).getAttribute('markdownPos')) {
                (event.target as HTMLElement).setAttribute('markdownPos', String(currentPos + getCaret(event)));
            }
        },
        ...props,
        style: { display: 'contents', ...props.style },
    });

export const Markdown: DynamicViewRenderer = ({ data, callbacks, isHeading }) => {
    const MarkdownComponent = React.useMemo(() => {
        return (
            <Typography
                variant={!isHeading ? 'body1' : 'h4'}
                style={{
                    opacity: data['_value.%'] || isHeading ? 'unset' : '0',
                }}
            >
                <ReactMarkdown
                    // eslint-disable-next-line react/no-children-prop
                    children={data['_value.%'] || (isHeading ? '_no title_' : '|')}
                    remarkPlugins={[remarkMath as any, remarkWikilink, remarkBreaks as any]}
                    rehypePlugins={[rehypeKatex, rehypeRaw as any]}
                    components={{
                        p: compFactory.bind(this, 'p'),
                        strong: compFactory.bind(this, 'strong'),
                        em: compFactory.bind(this, 'em'),
                        code: (props) =>
                            compFactory('code', {
                                ...props,
                                style: {
                                    display: '',
                                    wordBreak: 'break-word',
                                    fontSize: '0.8em',
                                    padding: '3px',
                                    backgroundColor: 'whitesmoke',
                                    border: '1px solid lightgray',
                                    borderRadius: '4px',
                                },
                            }),
                        img: ({ node, inline, className, children, ...props }: any) => {
                            console.log(node);
                            return compFactory('img', {
                                ...props,
                                node,
                                inline,
                                className,
                                children,
                                style: {
                                    display: '',
                                    // eslint-disable-next-line no-nested-ternary
                                    height: node?.properties?.alt?.startsWith?.('inline:') ? '1.5em' : '',
                                },
                            });
                        },
                        ol: (props) =>
                            compFactory('ol', {
                                ...props,
                                inline: true,
                                style: { marginLeft: '8px' },
                            }),
                        a: (props) =>
                            compFactory('a', {
                                ...props,
                                onPointerUp: (ev: any) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    window.open((props?.node as any)?.properties?.href, '_blank');
                                },
                                target: '_blank',
                                style: { cursor: 'pointer' },
                            }),
                        // TODO: optimize this
                        // eslint-disable-next-line react/no-unstable-nested-components
                        span: ({ node, inline, className, children, ...props }: any) => {
                            if (className?.includes('wikilink')) {
                                const matches = (
                                    callbacks?.['get-semantic-properties']?.()?._value?.children?.['_value['] || []
                                ).filter((el: any) => el._key === `[[${children[0]}]]` && el._value?.type);
                                const objDef =
                                    window.unigraph.getNamespaceMap?.()?.[
                                        matches[0]?._value?._value?.type?.['unigraph.id']
                                    ];
                                return (
                                    <>
                                        <span style={{ color: 'darkgray' }}>[[</span>
                                        {objDef ? (
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    minWidth: '16px',
                                                    minHeight: '15px',
                                                    backgroundImage: `url("data:image/svg+xml,${objDef?._icon}")`,
                                                    opacity: 0.54,
                                                }}
                                            />
                                        ) : (
                                            []
                                        )}
                                        {
                                            // eslint-disable-next-line react/no-children-prop
                                            React.createElement('span', {
                                                className,
                                                children,
                                                contentEditable: true,
                                                suppressContentEditableWarning: true,
                                                onPointerUp: (event: MouseEvent) => {
                                                    event.stopPropagation();
                                                    event.preventDefault();
                                                    if (matches[0])
                                                        window.wsnavigator(
                                                            `/library/object?uid=${
                                                                matches[0]._value._value.uid
                                                            }&viewer=${'dynamic-view-detailed'}&type=${
                                                                matches[0]._value._value?.type?.['unigraph.id']
                                                            }`,
                                                        );
                                                    else if (callbacks?.namespaceLink) {
                                                        window.open(callbacks.namespaceLink(children[0]), '_blank');
                                                    }
                                                },
                                                ...props,
                                                style: {
                                                    display: 'contents',
                                                    color:
                                                        matches[0] || callbacks?.namespaceLink ? 'mediumblue' : 'black',
                                                    ':hover': {
                                                        textDecoration: 'underline',
                                                    },
                                                    cursor: 'pointer',
                                                },
                                            })
                                        }
                                        <span style={{ color: 'darkgray' }}>]]</span>
                                    </>
                                );
                            }
                            // eslint-disable-next-line react/no-children-prop
                            return React.createElement('span', {
                                className,
                                children,
                                inline,
                                node,
                                ...props,
                            });
                        },
                    }}
                    rawSourcePos
                />
            </Typography>
        );
    }, [
        data['_value.%'],
        JSON.stringify(
            (callbacks?.['get-semantic-properties']?.()?._value?.children?.['_value[']?.sort() || [])?.map?.(
                (el: any) => el?._key,
            ),
        ),
    ]);
    return MarkdownComponent;
};
