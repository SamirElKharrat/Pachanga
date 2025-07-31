import React from 'react';
import { Button, Space, Tag, Card, Typography, Image } from 'antd';

const { Title, Paragraph, Text } = Typography;

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
            style={{
                width: 320,
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1rem'
            }}
            bodyStyle={{ padding: '1rem' }}
        >
            {image && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <Image
                        src={image}
                        alt={title}
                        preview={false}
                        height={80}
                        style={{ objectFit: 'contain' }}
                    />
                </div>
            )}

            <div style={{ flexGrow: 1 }}>
                <Title level={5} style={{ marginBottom: '1rem' }}>{title}</Title>
                {type && <Text type="secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>{type}</Text>}

                {date?.dates?.length > 0 && (
                    <Space wrap size={[4, 4]} style={{ marginBottom: '0.5rem' }}>
                        {date.dates.map((d, i) => (
                            <Tag key={i} color="black">
                                {new Date(d).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </Tag>
                        ))}
                    </Space>
                )}

                <Paragraph ellipsis={{ rows: 3 }}>{description}</Paragraph>
            </div>

            {onAction && (
                <div style={{ marginTop: '1rem' }}>
                    <Button type="primary" onClick={onAction}>
                        {actionText}
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default CardInfo;
