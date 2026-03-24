import React from "react";
import { Layout, Typography, Space, Divider } from "antd";
import { Link } from "react-router-dom";
import { GithubOutlined, HeartFilled } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Application footer component with legal links and copyright information.
 * 
 * @returns {React.ReactElement} The Footer component.
 */
const Footer = () => {
    return (
        <Layout.Footer style={{
            background: 'transparent',
            padding: '40px 20px',
            marginTop: 'auto'
        }}>
            <Divider className="opacity-10 mb-5" />
            
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <Space direction="horizontal" size="large" className="mb-3">
                    <Link to="/about" className="footer-link">
                        <Text strong type="secondary">Sobre Nosotros</Text>
                    </Link>
                    <Link to="/legal" className="footer-link">
                        <Text strong type="secondary">Aviso Legal</Text>
                    </Link>
                    <Link to="/contact" className="footer-link">
                        <Text strong type="secondary">Contacto</Text>
                    </Link>
                </Space>

                <div className="text-center">
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                        &copy; {new Date().getFullYear()} <strong>Pachanga</strong>. 
                        Todos los derechos reservados.
                    </Text>
                    <div className="mt-1">
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                            Desarrollado con <HeartFilled style={{ color: '#ff4d4f' }} /> por{' '}
                            <a 
                                href="https://github.com/SamirElKharrat" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary text-decoration-none"
                            >
                                <GithubOutlined /> Samir El Kharrat
                            </a>
                        </Text>
                    </div>
                </div>
            </Space>
        </Layout.Footer >
    );
};

export default Footer;
