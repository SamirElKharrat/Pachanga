import React from 'react';
import { Button, Space, Tag, Card, Typography, Image, theme, Flex } from 'antd';
import { CalendarOutlined, ArrowRightOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * A reusable card component for displaying entity information (e.g., Leagues).
 * 
 * @param {Object} props - Component props.
 * @param {string} props.title - The title of the card.
 * @param {string} [props.type] - Optional subtitle or type.
 * @param {string} [props.description] - Optional description text.
 * @param {string} [props.image] - URL for the thumbnail image.
 * @param {Object} [props.date] - Date information object.
 * @param {string[]} [props.date.dates] - Array of ISO date strings.
 * @param {Function} [props.onAction] - Callback for the primary button.
 * @param {string} [props.actionText] - Label for the primary button.
 * @returns {React.ReactElement} The rendered CardInfo component.
 */
const CardInfo = ({
    title,
    type,
    description,
    image,
    date,
    onAction,
    actionText
}) => {
    const { token } = theme.useToken();
    
    // Check if the current theme is light based on the base background token
    const isLight = token.colorBgBase === '#f8fafc';

    return (
        <Card
            hoverable
            style={{
                height: '100%',
                background: `linear-gradient(135deg, ${token.colorBgContainer}B3 0%, ${token.colorBgBase}CC 100%)`,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${token.colorBorderSecondary}66`,
                borderRadius: `${token.borderRadius * 2}px`,
                boxShadow: token.boxShadowTertiary || `0 8px 32px 0 ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.3)'}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
            styles={{
                body: { 
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '20px',
                    justifyContent: 'space-between'
                }
            }}
        >
            <Flex vertical>
                {image && (
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            background: token.colorFillAlter || 'rgba(0, 0, 0, 0.02)',
                            borderRadius: `${token.borderRadiusLG || token.borderRadius}px`,
                            padding: '16px',
                            height: '120px',
                            marginBottom: '16px',
                            border: `1px solid ${token.colorBorderSecondary}`,
                            boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.02)',
                        }}
                    >
                        <Image
                            src={image}
                            alt={title}
                            preview={false}
                            style={{ 
                                maxHeight: '88px', 
                                maxWidth: '100%', 
                                objectFit: 'contain',
                                filter: isLight 
                                    ? 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.08))' 
                                    : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.25)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.15))'
                            }}
                        />
                    </Flex>
                )}

                <Flex vertical gap={6} style={{ marginBottom: '16px' }}>
                    <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                        {title}
                    </Title>
                    {type && (
                        <Text type="secondary" style={{ display: 'block', fontSize: '13px' }}>
                            {type}
                        </Text>
                    )}

                    {date?.dates?.length > 0 && (
                        <Flex gap={8} align="start" style={{ margin: '6px 0 10px 0' }}>
                            <CalendarOutlined style={{ color: token.colorPrimary, fontSize: '14px', marginTop: '4px', flexShrink: 0 }} />
                            <Space size={[6, 6]} wrap>
                                {date.dates.map((d, i) => (
                                    <Tag 
                                        key={i} 
                                        color="processing"
                                        bordered={false}
                                        style={{
                                            margin: 0,
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            borderRadius: `${Math.round(token.borderRadius / 1.3)}px`
                                        }}
                                    >
                                        {new Date(d).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </Tag>
                                ))}
                            </Space>
                        </Flex>
                    )}

                    {description && (
                        <Paragraph type="secondary" style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }} ellipsis={{ rows: 3 }}>
                            {description}
                        </Paragraph>
                    )}
                </Flex>
            </Flex>

            {onAction && (
                <Flex style={{ marginTop: 'auto', paddingTop: '12px' }}>
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={onAction} 
                        block
                        style={{
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: `0 4px 12px ${token.colorPrimary}4D`
                        }}
                        icon={<ArrowRightOutlined />}
                    >
                        {actionText}
                    </Button>
                </Flex>
            )}
        </Card>
    );
};

export default CardInfo;
