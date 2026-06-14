import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Generator, buildNameVariables, builtinBlueprints } from '../src/generator.js'
import { nestModuleBlueprint } from '../src/blueprints/nest-module.js'
import { resolveConfig } from '../src/config.js'

describe('buildNameVariables (backend additions)', () => {
  it('derives snake + pluralised names', () => {
    expect(buildNameVariables('user profile')).toMatchObject({
      pascalName: 'UserProfile',
      kebabName: 'user-profile',
      snakeName: 'user_profile',
      pluralKebab: 'user-profiles',
      tableName: 'user_profiles',
    })
    // irregular-ish pluralisation
    expect(buildNameVariables('category').tableName).toBe('categories')
    expect(buildNameVariables('class').tableName).toBe('classes')
  })
})

describe('builtinBlueprints framework awareness', () => {
  it('module -> frontend by default, backend when framework=node', () => {
    const web = builtinBlueprints('web').find((b) => b.name === 'module')!
    const node = builtinBlueprints('node').find((b) => b.name === 'module')!
    expect(web.files('x', buildNameVariables('x'))).toHaveLength(2) // service + barrel
    expect(node.files('x', buildNameVariables('x'))).toHaveLength(6) // full nest module
  })

  it('always exposes nest-module and web-module explicitly', () => {
    const names = builtinBlueprints('web').map((b) => b.name)
    expect(names).toEqual(expect.arrayContaining(['nest-module', 'web-module', 'module']))
  })
})

describe('nest-module generation', () => {
  let projectRoot: string
  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-nest-'))
  })
  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true })
  })

  it('writes module/service/controller/entity/dto with correct names', async () => {
    const gen = new Generator(projectRoot, resolveConfig())
    builtinBlueprints().forEach((b) => gen.register(b))

    const written = await gen.generate('nest-module', 'order item')
    expect(written).toEqual(
      expect.arrayContaining([
        path.join('src', 'modules', 'order-item', 'order-item.module.ts'),
        path.join('src', 'modules', 'order-item', 'order-item.service.ts'),
        path.join('src', 'modules', 'order-item', 'order-item.controller.ts'),
        path.join('src', 'modules', 'order-item', 'entities', 'order-item.entity.ts'),
        path.join('src', 'modules', 'order-item', 'dto', 'create-order-item.dto.ts'),
        path.join('src', 'modules', 'order-item', 'dto', 'update-order-item.dto.ts'),
      ]),
    )

    const read = (p: string) =>
      fs.readFile(path.join(projectRoot, 'src', 'modules', 'order-item', p), 'utf8')

    const entity = await read('entities/order-item.entity.ts')
    expect(entity).toContain("@Entity('order_items')")
    expect(entity).toContain('export class OrderItem extends BaseEntity')

    const controller = await read('order-item.controller.ts')
    expect(controller).toContain("@Controller('order-items')")
    expect(controller).toContain("@Permissions('order-item:write')")
    expect(controller).toContain('OrderItemService')

    const moduleFile = await read('order-item.module.ts')
    expect(moduleFile).toContain('TypeOrmModule.forFeature([OrderItem])')
    expect(moduleFile).toContain('export class OrderItemModule')

    const update = await read('dto/update-order-item.dto.ts')
    expect(update).toContain('PartialType(CreateOrderItemDto)')
  })

  it('honours a custom command name', () => {
    const bp = nestModuleBlueprint('api-resource', 'desc')
    expect(bp.name).toBe('api-resource')
    expect(bp.targetDir).toBe('src/modules')
  })
})
