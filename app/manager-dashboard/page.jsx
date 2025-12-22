'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Building2, Users, UserCheck } from 'lucide-react';

export default function ManagerDashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/manager/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        setOrganizations(data.organizations);
      } else {
        alert('Failed to load dashboard');
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/manager/toggle-status/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchDashboard(); // Refresh
      } else {
        alert('Failed to toggle status');
      }
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.isActive).length;
  const pendingOrgs = organizations.filter(o => !o.isActive).length;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold">Manager Dashboard</h1>
          </div>
          <p className="text-gray-600">Welcome, praskla@gmail.com</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalOrgs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
              <UserCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeOrgs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Users className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendingOrgs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Company Name</th>
                    <th className="text-left p-3">Owner Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-center p-3">Admins</th>
                    <th className="text-center p-3">Employees</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr
                      key={org.id}
                      className={`border-b hover:bg-gray-50 ${
                        org.isActive ? 'bg-green-50' : 'bg-orange-50'
                      }`}
                    >
                      <td className="p-3 font-medium">{org.name}</td>
                      <td className="p-3">{org.ownerEmail}</td>
                      <td className="p-3">{org.phone || 'N/A'}</td>
                      <td className="p-3 text-center">{org.adminCount}</td>
                      <td className="p-3 text-center">{org.employeeCount}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            org.isActive
                              ? 'bg-green-200 text-green-800'
                              : 'bg-orange-200 text-orange-800'
                          }`}
                        >
                          {org.isActive ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={org.isActive ? 'destructive' : 'default'}
                          onClick={() => toggleStatus(org.id)}
                        >
                          {org.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
