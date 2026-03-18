import React from 'react';
import { Button, Space, Tag, Card, Typography, Image } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

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
    return (
        <Card
            hoverable
            className="shadow-sm h-100"
            styles={{
                body: { 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '24px'
                }
            }}
        >
            {image && (
                <div className="text-center mb-4" style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                        src={image}
                        alt={title}
                        preview={false}
                        style={{ maxHeight: 100, width: 'auto', objectFit: 'contain' }}
                    />
                </div>
            )}

            <div style={{ flexGrow: 1 }}>
                <Title level={4} className="mb-2">{title}</Title>
                {type && <Text type="secondary" className="d-block mb-3">{type}</Text>}

                {date?.dates?.length > 0 && (
                    <div className="mb-3">
                        <Space wrap size={[8, 8]}>
                            <CalendarOutlined className="text-primary" />
                            {date.dates.map((d, i) => (
                                <Tag key={i} color="blue" bordered={false}>
                                    {new Date(d).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </Tag>
                            ))}
                        </Space>
                    </div>
                )}

                {description && <Paragraph type="secondary" ellipsis={{ rows: 3 }}>{description}</Paragraph>}
            </div>

            {onAction && (
                <div className="mt-4">
                    <Button type="primary" size="large" onClick={onAction} block>
                        {actionText}
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default CardInfo;
