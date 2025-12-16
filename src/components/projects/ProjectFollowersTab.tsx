import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ProjectFollowersTabProps {
  projectId: string;
}

export const ProjectFollowersTab = ({ projectId }: ProjectFollowersTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: followers = [] } = useQuery({
    queryKey: ["project-followers", projectId],
    queryFn: async () => {
      // First get team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("id, user_id, joined_at, role")
        .eq("project_id", projectId)
        .order("joined_at", { ascending: false });

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Then get profiles for those members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      // Combine the data
      return members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.id === member.user_id) || null
      }));
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addFollowerMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const { error } = await supabase.from("team_members").insert({
        project_id: projectId,
        user_id: data.userId,
        role: data.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-followers"] });
      toast({ title: "Đã thêm người theo dõi" });
      setSelectedUserId("");
    },
    onError: () => {
      toast({ title: "Lỗi khi thêm người theo dõi", variant: "destructive" });
    },
  });

  const removeFollowerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-followers"] });
      toast({ title: "Đã xóa người theo dõi" });
    },
  });

  const handleAddFollower = () => {
    if (selectedUserId) {
      addFollowerMutation.mutate({ userId: selectedUserId, role: "Theo dõi" });
    }
  };

  const availableUsers = allUsers.filter(
    (user) => !followers.some((f) => f.user_id === user.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Chọn người theo dõi" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAddFollower} disabled={!selectedUserId}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm
        </Button>
      </div>

      <div className="space-y-2">
        {followers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Chưa có người theo dõi</p>
        ) : (
          followers.map((follower) => {
            const profile = follower.profiles as any;
            return (
              <div key={follower.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>{profile?.full_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {follower.role} • Tham gia {format(new Date(follower.joined_at), "dd/MM/yyyy", { locale: vi })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeFollowerMutation.mutate(follower.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
