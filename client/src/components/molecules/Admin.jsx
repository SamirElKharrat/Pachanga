import React from 'react';
import { Card, Tabs, Typography } from 'antd';
import AdminPanel from '../atoms/AdminPanel';
import {
    SettingOutlined, UserOutlined, TeamOutlined,
    TrophyOutlined, ScheduleOutlined, GlobalOutlined,
    ControlOutlined, FileTextOutlined
} from '@ant-design/icons';

const { Title } = Typography;

/**
 * Administrative dashboard for managing application entities.
 */
const Admin = () => {
    const tabItems = [
        {
            key: '1',
            label: <span><UserOutlined /> Usuarios</span>,
            children: (
                <AdminPanel
                    table="users"
                    relation={['roles']}
                    name="Usuario"
                    fields={['text', 'text', 'password', 'file', 'select']}
                    names={['username', 'email', 'password', 'logo_url', 'roles']}
                />
            )
        },
        {
            key: '2',
            label: <span><ControlOutlined /> Roles</span>,
            children: (
                <AdminPanel
                    table="roles"
                    name="Rol"
                    fields={['text']}
                    names={['name']}
                />
            )
        },
        {
            key: '3',
            label: <span><GlobalOutlined /> Ligas</span>,
            children: (
                <AdminPanel
                    table="leagues"
                    relation={['teams']}
                    name="Liga"
                    fields={['text', 'date', 'date', 'file', 'multiselect', 'select']}
                    names={['name', 'start_date', 'end_date', 'logo_url', 'teams', 'status']}
                />
            )
        },
        {
            key: '4',
            label: <span><TeamOutlined /> Equipos</span>,
            children: (
                <AdminPanel
                    table="teams"
                    name="Equipo"
                    fields={['text', 'text', 'file']}
                    names={['name', 'acronym', 'logo_url']}
                />
            )
        },
        {
            key: '5',
            label: <span><ScheduleOutlined /> Partidos</span>,
            children: (
                <AdminPanel
                    table="matches"
                    relation={['leagues', 'teams']}
                    name="Partido"
                    fields={['select', 'date', 'select', 'select', 'multiselect']}
                    names={['leagues', 'date', 'format', 'status', 'teams']}
                />
            )
        },
        {
            key: '6',
            label: <span><TrophyOutlined /> Resultados</span>,
            children: (
                <AdminPanel
                    table="results"
                    relation={['matches', 'teams']}
                    name="Resultado"
                    fields={['select', 'select', 'result_select']}
                    names={['match_id', 'winner', 'result']}
                />
            )
        },
        {
            key: '7',
            label: <span><FileTextOutlined /> Predicciones</span>,
            children: (
                <AdminPanel
                    table="predictions"
                    relation={['matches', 'teams']}
                    name="Predicción"
                    fields={['select', 'select', 'select', 'text', 'number']}
                    names={['match_id', 'type', 'winner', 'description', 'points']}
                />
            )
        }
    ];

    return (
        <div style={{ padding: '12px 12px 40px' }}>
            <Title level={3} style={{ marginBottom: 16 }}>Panel de Administración</Title>
            <Card className="shadow-sm" styles={{ body: { padding: '12px 8px' } }}>
                <Tabs
                    defaultActiveKey="1"
                    items={tabItems}
                    size="middle"
                    tabBarGutter={32}
                />
            </Card>
        </div>
    );
};

export default Admin;
