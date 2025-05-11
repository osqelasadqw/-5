import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  doc,
  setDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  isAdmin, 
  assignRole, 
  getUserRole, 
  UserRole,
  UserRoleData
} from '@/services/roleService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  username: string;
  role?: UserRole;
  assignedBy?: string;
  assignedAt?: number;
}

const AdminRoles: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  useEffect(() => {
    const checkAdmin = async () => {
      if (!currentUser || !currentUser.email) {
        navigate('/');
        return;
      }

      try {
        const admin = await isAdmin(currentUser.email);
        setIsAdminUser(admin);

        if (!admin) {
          toast.error('თქვენ არ გაქვთ წვდომა ამ გვერდზე');
          navigate('/');
        } else {
          fetchUsers();
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      }
    };

    checkAdmin();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('email'));
      const querySnapshot = await getDocs(q);

      const userPromises = querySnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        let roleData: UserRoleData | null = null;

        if (userData.email) {
          roleData = await getUserRole(userData.email);

          if (!roleData && userData.admin !== true) {
            return {
              id: doc.id,
              email: userData.email || '',
              username: userData.username || 'Unknown User',
              role: 'user' as UserRole,
              assignedBy: null,
              assignedAt: null
            };
          } else if (!roleData && userData.admin === true) {
            return {
              id: doc.id,
              email: userData.email || '',
              username: userData.username || 'Unknown User',
              role: 'admin' as UserRole,
              assignedBy: null,
              assignedAt: null
            };
          }
        }

        return {
          id: doc.id,
          email: userData.email || '',
          username: userData.username || 'Unknown User',
          role: roleData?.role || 'user',
          assignedBy: roleData?.assignedBy,
          assignedAt: roleData?.assignedAt
        };
      });

      const usersWithRoles = await Promise.all(userPromises);
      setUsers(usersWithRoles);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleAssignRole = async (userEmail: string, role: UserRole) => {
    if (!currentUser || !currentUser.email) return;

    try {
      const success = await assignRole(userEmail, role, currentUser.email);

      if (success) {
        toast.success(`როლი "${role}" მინიჭებულია მომხმარებლისთვის ${userEmail}`);
        fetchUsers(); // Refresh user list
      } else {
        toast.error('როლის მინიჭება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('დაფიქსირდა შეცდომა როლის მინიჭებისას');
    }
  };

  const handleAddNewRole = async () => {
    if (!newEmail || !newRole) {
      toast.error('გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    if (!currentUser || !currentUser.email) return;

    try {
      const success = await assignRole(newEmail, newRole, currentUser.email);

      if (success) {
        toast.success(`როლი "${newRole}" მინიჭებულია მომხმარებლისთვის ${newEmail}`);
        setNewEmail('');
        fetchUsers(); // Refresh user list
      } else {
        toast.error('როლის მინიჭება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('დაფიქსირდა შეცდომა როლის მინიჭებისას');
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  // დავამატოთ ფუნქცია ყველა მომხმარებლის როლის ერთდროულად განახლებისთვის
  const syncAllUsersRoles = async () => {
    if (!currentUser || !currentUser.email) return;
    
    try {
      setLoading(true);
      toast.info('მიმდინარეობს მომხმარებლების როლების სინქრონიზაცია...');
      
      // მივიღოთ ყველა მომხმარებელი
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      let successCount = 0;
      let errorCount = 0;
      
      // გადავუაროთ ყველა მომხმარებელს და გავუკეთოთ როლების სინქრონიზაცია
      const promises = querySnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        
        if (userData.email) {
          try {
            const roleRef = doc(db, 'roles', userData.email);
            
            // თუ მომხმარებელს აქვს admin=true, დავარქვათ 'admin' როლი
            if (userData.admin === true) {
              await setDoc(roleRef, {
                email: userData.email,
                role: 'admin',
                assignedBy: currentUser.email,
                assignedAt: Date.now()
              });
            } else {
              // სხვა შემთხვევაში დავარქვათ 'user' როლი თუ როლი არ აქვს მინიჭებული
              const roleData = await getUserRole(userData.email);
              if (!roleData) {
                await setDoc(roleRef, {
                  email: userData.email,
                  role: 'user',
                  assignedBy: currentUser.email,
                  assignedAt: Date.now()
                });
              }
            }
            
            successCount++;
          } catch (error) {
            console.error(`Error syncing role for ${userData.email}:`, error);
            errorCount++;
          }
        }
      });
      
      await Promise.all(promises);
      
      if (errorCount > 0) {
        toast.warning(`სინქრონიზაცია დასრულდა: ${successCount} წარმატებით, ${errorCount} შეცდომით`);
      } else {
        toast.success(`ყველა მომხმარებლის როლი წარმატებით სინქრონიზირებულია (${successCount})`);
      }
      
      // დავარეფრეშოთ სია
      fetchUsers();
    } catch (error) {
      console.error('Error syncing all users:', error);
      toast.error('დაფიქსირდა შეცდომა სინქრონიზაციისას');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminUser) {
    return (
      <div className="min-h-screen flex flex-col bg-dark">
        <Header />
        <div className="container mx-auto py-8 px-4 flex justify-center items-center flex-grow">
          <div className="text-white">თქვენ არ გაქვთ წვდომა ამ გვერდზე</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">მომხმარებლის როლების მართვა</h1>
          
          <Button 
            onClick={syncAllUsersRoles}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            ყველა მომხმარებლის როლების სინქრონიზაცია
          </Button>
        </div>

        {/* Add new role */}
        <div className="bg-dark-card rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">მიანიჭეთ ახალი როლი</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                მომხმარებლის მეილი
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-dark border border-gray-700 text-white"
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-400 mb-1">
                როლი
              </label>
              <Select 
                value={newRole} 
                onValueChange={(value: UserRole) => setNewRole(value)}
              >
                <SelectTrigger className="bg-dark border border-gray-700 text-white">
                  <SelectValue placeholder="აირჩიეთ როლი" />
                </SelectTrigger>
                <SelectContent className="bg-dark-card border border-gray-700">
                  <SelectItem value="user">მომხმარებელი</SelectItem>
                  <SelectItem value="seller">გამყიდველი</SelectItem>
                  <SelectItem value="escrow_agent">Escrow Agent</SelectItem>
                  <SelectItem value="admin">ადმინისტრატორი</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleAddNewRole}
                className="bg-purple hover:bg-purple-light text-white"
              >
                დაამატეთ როლი
              </Button>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-dark-card rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">მომხმარებლები და როლები</h2>
          
          {loading ? (
            <div className="text-gray-400 text-center py-8">
              მომხმარებლების ჩატვირთვა...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">მეილი</TableHead>
                    <TableHead className="text-gray-400">სახელი</TableHead>
                    <TableHead className="text-gray-400">მიმდინარე როლი</TableHead>
                    <TableHead className="text-gray-400">მინიჭებულია</TableHead>
                    <TableHead className="text-gray-400">დრო</TableHead>
                    <TableHead className="text-gray-400">მოქმედება</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-white">{user.email}</TableCell>
                      <TableCell className="text-white">{user.username}</TableCell>
                      <TableCell className="text-white capitalize">{user.role}</TableCell>
                      <TableCell className="text-white">{user.assignedBy || '-'}</TableCell>
                      <TableCell className="text-white">{formatDate(user.assignedAt)}</TableCell>
                      <TableCell>
                        <Select 
                          onValueChange={(value: UserRole) => handleAssignRole(user.email, value as UserRole)}
                          defaultValue={user.role}
                        >
                          <SelectTrigger className="bg-dark border border-gray-700 text-white w-[180px]">
                            <SelectValue placeholder="შეცვალეთ როლი" />
                          </SelectTrigger>
                          <SelectContent className="bg-dark-card border border-gray-700">
                            <SelectItem value="user">მომხმარებელი</SelectItem>
                            <SelectItem value="seller">გამყიდველი</SelectItem>
                            <SelectItem value="escrow_agent">Escrow Agent</SelectItem>
                            <SelectItem value="admin">ადმინისტრატორი</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {users.length === 0 && (
                <div className="text-gray-400 text-center py-4">
                  მომხმარებლები ვერ მოიძებნა
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoles; 