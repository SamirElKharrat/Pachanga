import React from 'react'
import { Card, Tabs } from 'antd';
import AdminPanel from '../atoms/AdminPanel';

const { TabPane } = Tabs;

const Admin = () => {
    return (
        <Card className='container mt-5'>
            <Tabs defaultActiveKey="1">
                <TabPane tab="Usuarios" key="1">
                    <AdminPanel
                        table="users"
                        relation={["roles"]}
                        name="Usuario"
                        fields={["text", "text", "password", "file", "select"]}
                        names={["username", "email", "password", "logo_url", "roles"]} />
                </TabPane>
                <TabPane tab="Roles" key="2">
                    <AdminPanel
                        table="roles"
                        name="Rol"
                        fields={["text"]}
                        names={["name"]} />
                </TabPane>
                <TabPane tab="Ligas" key="3">
                    <AdminPanel
                        table="leagues"
                        relation={["teams"]}
                        name="Liga"
                        fields={["text", "date", "date", "file", "multiselect", 'select']}
                        names={["name", "start_date", "end_date", "logo_url", "teams", "status"]} />
                </TabPane>
                <TabPane tab="Equipos" key="4">
                    <AdminPanel
                        table="teams"
                        name="Equipo"
                        fields={["text", "text", "file"]}
                        names={["name", "acronym", "logo_url"]} />
                </TabPane>
                <TabPane tab="Partidos" key="5">
                    <AdminPanel
                        table="matches"
                        relation={["leagues", "teams"]}
                        name="Partido"
                        fields={["select", "date", "select", "select", "multiselect"]}
                        names={["leagues", "date", "format", "status", "teams"]} />
                </TabPane>
                <TabPane tab="Resultados" key="6">
                    <AdminPanel
                        table="results"
                        relation={["matches", "teams"]}
                        name="Resultado"
                        fields={["select", "select", "text"]}
                        names={["match_id", "winner", "result"]} />
                </TabPane>
                <TabPane tab="Predicciones" key="7">
                    <AdminPanel
                        table="predictions"
                        relation={["matches", "teams"]}
                        name="Predicción"
                        fields={["select", "select", "select", "text", "number"]}
                        names={["match_id", "type", "winner", "description", "points"]} />
                </TabPane>
            </Tabs>
        </Card>

    )
}

export default Admin
