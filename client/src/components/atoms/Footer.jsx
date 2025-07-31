import React from "react";
import { Layout, Typography, Space } from "antd";
import { Link } from "react-router-dom";

const { Text } = Typography;

const Footer = () => {
    return (
        <Layout.Footer style={{
            background: '#001529',
        }}>
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <Space direction="horizontal" size="large" style={{ width: '100%', justifyContent: 'center' }}>
                    <Link to="/about" style={{ textDecoration: 'none' }}>
                        <Text strong style={{ color: '#ffffff' }}>Sobre Nosotros</Text>
                    </Link>
                    <Link to="/legal" style={{ textDecoration: 'none' }}>
                        <Text strong style={{ color: '#ffffff' }}>Aviso Legal</Text>
                    </Link>
                    <Link to="/contact" style={{ textDecoration: 'none' }}>
                        <Text strong style={{ color: '#ffffff' }}>Contacto</Text>
                    </Link>
                </Space>
                <Text style={{ fontSize: '12px', color: '#ffffff' }}>
                    &copy; {new Date().getFullYear()} La Pachanga. Desarrollado por <a href="https://github.com/SamirElKharrat" target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff' }}>Samir El Kharrat</a>.
                </Text>
            </Space>
        </Layout.Footer >
    );
};

export default Footer;
