
import Users from "../Schema/Users.js";


const ensureAuthenticated = async (req, res, next) => {
  // Extract the user ID from the request query parameters
  const userId = req.query.userId; // Assuming userId is passed as a query parameter
  
  try {
    // Check if userId is present
    if (!userId) {
      return res.status(400).json({ error: 'User ID not provided in the request query parameters' });
    } 

    const foundUser = await Users.findById(userId);
    
    if (!foundUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Attach the found user object to the request
    req.user = foundUser;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default ensureAuthenticated;
