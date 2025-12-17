import User, { IUser } from '../models/User';

export class UserService {

    /**
     * Get user profile by ID
     */
    async getUserById(userId: string): Promise<IUser> {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
        // Prevent password update through this method
        delete updateData.password;
        delete updateData.email; // Email usually immutable or requires special flow

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * Add Broker Connection
     */
    async addBrokerConnection(userId: string, brokerData: any): Promise<IUser> {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Basic validation - check if broker already exists
        const exists = user.brokerConnections.some(b => b.broker === brokerData.broker && b.isActive);
        if (exists) {
            throw new Error(`${brokerData.broker} is already connected`);
        }

        user.brokerConnections.push({
            ...brokerData,
            isActive: true,
            connectedAt: new Date()
        });

        await user.save();
        return user;
    }

    /**
     * Remove/Disconnect Broker
     */
    async disconnectBroker(userId: string, broker: string): Promise<IUser> {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const connectionIndex = user.brokerConnections.findIndex(b => b.broker === broker);
        if (connectionIndex === -1) {
            throw new Error('Broker connection not found');
        }

        user.brokerConnections[connectionIndex].isActive = false;
        await user.save();
        return user;
    }
}

export const userService = new UserService();
