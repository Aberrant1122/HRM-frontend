"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {restoreDepartment,type Department} from "@/lib/actions/department.actions";
import { useDepartments } from "@/hooks/use-departments";

interface DepartmentManagerProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
}

export function DepartmentManager({
  value,
  onValueChange,
  error = false,
  placeholder = "Select department",
}: DepartmentManagerProps) {
  const { 
    departments, 
    isLoading, 
    isInitialLoading, 
    addDepartment, 
    deleteDepartment, 
    refreshDepartments 
  } = useDepartments();
  
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [archived,setArchived]=useState<Department|null>(null);
  const [newDepartment, setNewDepartment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) {
      toast.error("Please enter a department name");
      return;
    }

    setArchived(null);
    setIsSubmitting(true);
    const result = await addDepartment(newDepartment);
    
    if (result.success) {
      setNewDepartment("");
      toast.success(result.message);
    } else {
      if(result.archivedDepartment)setArchived(result.archivedDepartment);
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const handleRestore=async()=>{if(!archived)return;setIsSubmitting(true);try{const result=await restoreDepartment(archived.id);if(result.success){await refreshDepartments();setArchived(null);setNewDepartment('');toast.success('Department restored');}else toast.error(result.error||'Restore failed');}finally{setIsSubmitting(false);}};
  const handleDeleteDepartment = async (departmentId: number) => {
    const departmentToDelete = departments.find((dept) => dept.id === departmentId);
    
    if (!departmentToDelete) return;

    // Check if this department is currently selected
    if (value === departmentToDelete.name) {
      onValueChange(""); // Clear selection if deleting selected department
    }

    const result = await deleteDepartment(departmentId);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDepartment();
    }
  };

  const handleRefresh = async () => {
    await refreshDepartments();
    toast.success("Departments refreshed");
  };

  if (isInitialLoading) {
    return (
      <div className="flex gap-2">
        <Select disabled>
          <SelectTrigger className={`flex-1 ${error ? "border-red-500" : ""}`}>
            <SelectValue placeholder="Loading departments..." />
          </SelectTrigger>
        </Select>
        <Button type="button" variant="outline" size="icon" disabled>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`flex-1 ${error ? "border-red-500" : ""}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {departments.length === 0 ? (
            <SelectItem value="no-departments" disabled>
              No departments available
            </SelectItem>
          ) : (
            departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>
                {dept.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" title="Manage Departments">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Departments</DialogTitle>
            <DialogDescription>
              Add new departments or remove existing ones. Changes are saved to the database.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add new department */}
            <div className="space-y-2">
              <Label htmlFor="newDepartment">Add New Department</Label>
              <div className="flex gap-2">
                <Input
                  id="newDepartment"
                  value={newDepartment}
                  onChange={(e) => {setNewDepartment(e.target.value);setArchived(null);}}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter department name"
                  disabled={isSubmitting || isLoading}
                />
                <Button
                  type="button"
                  onClick={handleAddDepartment}
                  disabled={isSubmitting || isLoading || !newDepartment.trim()}
                  size="icon"
                  title="Add Department"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {archived&&<section className="border p-3 space-y-2" aria-label="Archived department match"><p>{archived.name} is archived. Restore the existing department to make it available again.</p>{archived.description&&<p>{archived.description}</p>}<Button type="button" disabled={isSubmitting||isLoading} onClick={handleRestore}>Restore {archived.name}</Button></section>}
            {/* Refresh departments */}
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-sm font-medium">Refresh Data</Label>
                <p className="text-xs text-gray-500">Reload departments from server</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh Departments"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Existing departments */}
            <div className="space-y-2">
              <Label>Current Departments ({departments.length})</Label>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2">
                {departments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No departments available. Add one above.
                  </p>
                ) : (
                  departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium">{dept.name}</span>
                        {dept.description && (
                          <p className="text-xs text-gray-500 mt-1">{dept.description}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDepartment(dept.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title={`Delete ${dept.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
