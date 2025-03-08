import { slugify } from '~/utils/formatters'

const createNewUser = async (req) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const newUser = {
      ...req,
      slug: slugify(req.fullName),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    //Trả kết quả về, trong service luôn phải có return
    return newUser
  } catch (error) {
    throw error
  }
}

export const userService = {
  createNewUser
}
