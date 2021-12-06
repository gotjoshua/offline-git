import { EncodeObject } from '@cosmjs/proto-signing'
import AddIcon from '@mui/icons-material/Add'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Fab from '@mui/material/Fab'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Zoom from '@mui/material/Zoom'
import addDays from 'date-fns/addDays'
import { sha256 } from 'js-sha256'
import { h } from 'preact'
import { useContext, useState } from 'preact/hooks'
import { AllocatorContext, CosmosContext } from '../../app'
import { addPendingTx, completePendingTx } from '../../Data/data'
import { Recipient } from '../../Model/Allocations'
import { TxRaw } from '../../Model/generated/cosmos/tx/v1beta1/tx'
import { Duration } from '../../Model/generated/google/protobuf/duration'
import { MsgCreateAllocator } from '../../Model/generated/regen/divvy/v1/tx'
import { FlexRow } from '../Minis'

const filter = createFilterOptions()

const ADD_NEW = 'Add a new Allocator: '
const optionDefaults = ['regenAllocatorAddress1', 'regenAllocatorAddress2']

export default function AllocatorsComboBox ({ ...passedProps }) {
  const [options, setOptions] = useState<string[]>(optionDefaults)
  const [value, setValue] = useState<string | null>(options[0])
  const [inputValue, setInputValue] = useState('')
  const [showAddButton, setShowAddButton] = useState(false)
  const { sgClient, clientAddress } = useContext(CosmosContext)
  const { recipientList } = useContext(AllocatorContext)

  const onClickAdd = async (mEv) => {
    if (!sgClient) return console.warn('no stargate client in context')

    const createAllocatorMsg: MsgCreateAllocator = MsgCreateAllocator.fromPartial({
      admin: clientAddress,
      start: new Date(),
      end: addDays(new Date(), 21),
      name: inputValue,
      interval: Duration.fromPartial({
        seconds: 60,
      }),
      /** url with metadata */
      url: 'https://meta.data',
      recipients: Array.from(recipientList.values()).map((eachRecip: Recipient) => ({
        address: eachRecip.recipient.address,
        share: eachRecip.value * 10000, /** allocation share. 100% = 1e6. */
      })),
    })
    const encodableMsg: EncodeObject = {
      typeUrl: '/regen.divvy.v1.MsgCreateAllocator',
      value: createAllocatorMsg,
    }
    console.log(encodableMsg)

    const fee = {
      amount: [
        {
          denom: 'uregen', // Use the appropriate fee denom for your chain
          amount: '40000',
        },
      ],
      gas: '80000',
    }

    const raw = await sgClient.sign(
      clientAddress,
      [encodableMsg],
      fee,
      '',
    )

    const finished = TxRaw.encode(raw).finish()
    console.log('signedTx', raw)
    const hash = sha256(finished).toUpperCase()
    console.log('finished', finished, hash)
    await addPendingTx({
      hash,
      finished,
      raw,
    })

    const bresponse = await sgClient.broadcastTx(finished)
    // const parsedLog = JSON.parse(bresponse.rawLog ?? '')
    console.log('broadcastTx', bresponse)
    void completePendingTx(bresponse.transactionHash, bresponse)
  }
  return (

    <Autocomplete
        {...passedProps}
        {...{ options, value, filterOptions }}
        onChange={(event: any, newValue: string | null) => {
          if (newValue && !options.includes(newValue)) {
            const newVa = newValue.split(ADD_NEW)[1]
            setOptions([...options, newVa])
            return setValue(newVa)
          }
          setValue(newValue)
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => {
          if (newInputValue && !options.includes(newInputValue)) {
            setValue(null)
            setShowAddButton(true)
          } else {
            setShowAddButton(false)
          }
          setInputValue(newInputValue)
        }}
        id="allocators-combo-box"
        sx={{ width: 300 }}
        renderInput={(params) => {
          if (showAddButton) {
            params.InputProps = {
              ...params.InputProps,

              startAdornment: (
                <InputAdornment position="start">
                  <Zoom
                    in={true}
                    unmountOnExit
                  >
                    <Fab size="small" color="primary" aria-label="add" onClick={onClickAdd}>
                      <AddIcon />
                    </Fab>
                  </Zoom>
                </InputAdornment>
              ),

            }
          }
          return (
            <FlexRow>
              <TextField {...params} label="Choose or Add an Allocator" />
            </FlexRow>
          )
        }}
      />

  )
}
const filterOptions = (options, params) => {
  const filtered = filter(options, params)

  if (params.inputValue !== '') {
    filtered.push(`${ADD_NEW}${params.inputValue}`)
  }

  return filtered
}
