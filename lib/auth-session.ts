import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export const getServerUser = async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) return null;

  return {
    ...user,
    _id: user._id.toString(),
    workspaces: user.workspaces?.map((w: { toString: () => string }) => w.toString()) ?? [],
  };
};
