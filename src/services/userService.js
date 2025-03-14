import { slugify } from '~/utils/formatters'
import { userModel } from '~/models/userModel'
const createNewUser = async (req) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const newUser = {
      ...req,
      slug: slugify(req.fullName)
    }

    const result = await userModel.createNew(newUser)

    const getNewUser = await userModel.findOneById(result.userID)
    //Trả kết quả về, trong service luôn phải có return
    return getNewUser
  } catch (error) {
    throw error
  }
}

export const userService = {
  createNewUser
}
